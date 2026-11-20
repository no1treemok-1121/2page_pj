-- 3d_pj 소원 테이블. Supabase 대시보드 → SQL Editor 에 붙여 넣고 Run.
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(btrim(text)) between 1 and 100),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  x real not null check (x between -3 and 3),
  y real not null check (y between 0 and 6),
  z real not null check (z between -3 and 3),
  created_at timestamptz not null default now()
);

alter table public.wishes enable row level security;

-- 누구나 소원을 볼 수 있고, 새로 걸 수만 있음 (수정·삭제 불가)
drop policy if exists "wishes are readable" on public.wishes;
create policy "wishes are readable" on public.wishes
  for select to anon, authenticated using (true);

drop policy if exists "anyone can hang a wish" on public.wishes;
create policy "anyone can hang a wish" on public.wishes
  for insert to anon, authenticated with check (true);

-- 소원에 이름·별명 (선택, 최대 12자)
alter table public.wishes add column if not exists name text check (name is null or char_length(btrim(name)) between 1 and 12);

-- 소원을 건 사람의 방 (있으면 소원함에서 '방 놀러 가기' 가능). 방이 지워지면 연결만 끊김
alter table public.wishes add column if not exists room_id uuid references public.rooms(id) on delete set null;

-- 방을 나중에 만든 경우: 이 기기에서 건 소원(아직 방 연결 없는 것)을 내 방에 연결 (방 주인 열쇠 확인)
create or replace function public.link_my_wishes(p_room uuid, p_key text, p_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from rooms where id = p_room and owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not owner';
  end if;
  update wishes set room_id = p_room where id = any(p_ids[1:200]) and room_id is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.link_my_wishes(uuid, text, uuid[]) from public;
grant execute on function public.link_my_wishes(uuid, text, uuid[]) to anon, authenticated;
