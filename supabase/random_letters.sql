-- 랜덤 편지와 답장 (로그인 없음)
-- 브라우저마다 비밀 열쇠(visitor key)를 만들고, DB에는 그 SHA-256 해시만 저장해 "쓴 사람/받은 사람"을 구분.
-- 쓴 편지는 마을에 들어온 다른 사람 최대 10명에게 전달되고, 받은 사람은 한 번 답장할 수 있음(쓴 사람만 읽음).
-- 테이블은 직접 접근 불가(RLS 정책 없음), 아래 함수로만 사용.

create table if not exists public.random_letters (
  id uuid primary key default gen_random_uuid(),
  sender_hash text not null,
  from_name text not null check (char_length(btrim(from_name)) between 1 and 12),
  avatar text check (avatar is null or avatar ~ '^[a-z]{2,10}:#[0-9a-f]{6}:[a-z]{2,10}$'),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  deliveries int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.random_letters enable row level security;
create index if not exists random_letters_open_idx on public.random_letters (created_at) where deliveries < 10;

create table if not exists public.random_deliveries (
  letter_id uuid not null references public.random_letters(id) on delete cascade,
  receiver_hash text not null,
  delivered_at timestamptz not null default now(),
  reply text check (reply is null or char_length(btrim(reply)) between 1 and 300),
  replied_at timestamptz,
  primary key (letter_id, receiver_hash)
);
alter table public.random_deliveries enable row level security;
create index if not exists random_deliveries_receiver_idx on public.random_deliveries (receiver_hash);

create or replace function public.visitor_hash(p_key text) returns text
language sql immutable as $$ select encode(sha256(convert_to(p_key, 'UTF8')), 'hex') $$;

-- 편지 쓰기
create or replace function public.write_random_letter(p_key text, p_from text, p_body text, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_key, '')) < 32 then raise exception 'bad key'; end if;
  insert into random_letters (sender_hash, from_name, avatar, body)
  values (visitor_hash(p_key), coalesce(nullif(btrim(coalesce(p_from, '')), ''), '익명의 누군가'), p_avatar, btrim(p_body));
end $$;

-- 마을에 들어올 때: 아직 못 받은 편지를 최대 3통 새로 받고, 받은 편지함 전체를 돌려줌
create or replace function public.receive_random_letters(p_key text)
returns table (id uuid, from_name text, avatar text, body text, created_at timestamptz, reply text)
language plpgsql security definer set search_path = public as $$
declare h text := visitor_hash(p_key);
begin
  if char_length(coalesce(p_key, '')) < 32 then raise exception 'bad key'; end if;
  with picked as (
    select l.id from random_letters l
    where l.deliveries < 10 and l.sender_hash <> h
      and not exists (select 1 from random_deliveries d where d.letter_id = l.id and d.receiver_hash = h)
    order by l.created_at
    limit 3
    for update skip locked
  ), ins as (
    insert into random_deliveries (letter_id, receiver_hash) select picked.id, h from picked
    returning letter_id
  )
  update random_letters set deliveries = deliveries + 1 where random_letters.id in (select letter_id from ins);

  return query
    select l.id, l.from_name, l.avatar, l.body, d.delivered_at, d.reply
    from random_deliveries d join random_letters l on l.id = d.letter_id
    where d.receiver_hash = h
    order by d.delivered_at desc
    limit 100;
end $$;

-- 받은 편지에 답장 (한 번만)
create or replace function public.reply_random_letter(p_key text, p_letter uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update random_deliveries set reply = btrim(p_body), replied_at = now()
  where letter_id = p_letter and receiver_hash = visitor_hash(p_key) and reply is null;
  if not found then raise exception 'cannot reply'; end if;
end $$;

-- 내가 쓴 편지와 받은 답장
create or replace function public.my_random_letters(p_key text)
returns table (id uuid, body text, created_at timestamptz, deliveries int, replies jsonb)
language sql stable security definer set search_path = public as $$
  select l.id, l.body, l.created_at, l.deliveries,
    coalesce((select jsonb_agg(jsonb_build_object('reply', d.reply, 'at', d.replied_at) order by d.replied_at)
              from random_deliveries d where d.letter_id = l.id and d.reply is not null), '[]'::jsonb)
  from random_letters l
  where l.sender_hash = visitor_hash(p_key)
  order by l.created_at desc
  limit 50;
$$;

revoke all on function public.write_random_letter(text, text, text, text), public.receive_random_letters(text),
  public.reply_random_letter(text, uuid, text), public.my_random_letters(text) from public;
grant execute on function public.write_random_letter(text, text, text, text), public.receive_random_letters(text),
  public.reply_random_letter(text, uuid, text), public.my_random_letters(text) to anon, authenticated;
