-- 방과 편지. 로그인 없이 "방 링크" 방식으로 동작.
-- 방 주인은 만들 때 받은 비밀 열쇠(owner_key)로 구분하며, DB에는 그 해시만 저장.
-- 테이블은 직접 읽고 쓸 수 없고(RLS 정책 없음), 아래 함수로만 접근.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  owner_key_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_name text not null check (char_length(btrim(from_name)) between 1 and 12),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.letters enable row level security;
create index if not exists letters_room_idx on public.letters (room_id, created_at desc);

-- 방 만들기: 방 id와 주인 열쇠를 돌려줌 (열쇠 원문은 이때 한 번만 나옴)
create or replace function public.create_room(p_nickname text)
returns table (room_id uuid, owner_key text)
language plpgsql security definer set search_path = public as $$
declare
  k text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  rid uuid;
begin
  insert into rooms (nickname, owner_key_hash)
    values (btrim(p_nickname), encode(sha256(convert_to(k, 'UTF8')), 'hex'))
    returning id into rid;
  return query select rid, k;
end $$;

-- 방 정보 (누구나): 닉네임과 받은 편지 수
create or replace function public.get_room(p_room uuid)
returns table (nickname text, letter_count int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.nickname, (select count(*)::int from letters l where l.room_id = r.id), r.created_at
  from rooms r where r.id = p_room;
$$;

-- 편지 보내기 (누구나). 도배 방지: 한 방에 1분 동안 최대 10통
create or replace function public.send_letter(p_room uuid, p_from text, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from rooms where id = p_room) then
    raise exception 'room not found';
  end if;
  if (select count(*) from letters where room_id = p_room and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many letters';
  end if;
  -- 보내는 사람을 비우면 익명으로
  insert into letters (room_id, from_name, body)
    values (p_room, coalesce(nullif(btrim(coalesce(p_from, '')), ''), '익명의 누군가'), btrim(p_body));
end $$;

-- 편지 읽기 (방 주인만)
create or replace function public.get_letters(p_room uuid, p_key text)
returns table (id uuid, from_name text, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from rooms r
    where r.id = p_room and r.owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    raise exception 'not owner';
  end if;
  return query
    select l.id, l.from_name, l.body, l.created_at from letters l
    where l.room_id = p_room order by l.created_at desc;
end $$;

-- 편지 지우기 (방 주인만)
create or replace function public.delete_letter(p_room uuid, p_key text, p_letter uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from rooms r
    where r.id = p_room and r.owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    raise exception 'not owner';
  end if;
  delete from letters where id = p_letter and room_id = p_room;
end $$;

revoke all on function public.create_room(text), public.get_room(uuid), public.send_letter(uuid, text, text),
  public.get_letters(uuid, text), public.delete_letter(uuid, text, uuid) from public;
grant execute on function public.create_room(text), public.get_room(uuid), public.send_letter(uuid, text, text),
  public.get_letters(uuid, text), public.delete_letter(uuid, text, uuid) to anon, authenticated;
