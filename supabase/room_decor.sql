-- 🎨 방 꾸미기: 벽지·바닥·러그 색, 소품(트리·꼬마전구·선물·양말·촛불·눈사람 인형), 테이블 위 음식
-- rooms.decor (jsonb, 2000자 이하). 주인 열쇠가 있어야 바꿀 수 있고, get_room이 함께 돌려줌.
alter table public.rooms add column if not exists decor jsonb not null default '{}'::jsonb;
alter table public.rooms drop constraint if exists rooms_decor_size;
alter table public.rooms add constraint rooms_decor_size check (jsonb_typeof(decor) = 'object' and length(decor::text) <= 2000);

drop function if exists public.get_room(uuid);
create function public.get_room(p_room uuid)
returns table (nickname text, letter_count int, created_at timestamptz, avatar text, decor jsonb)
language sql stable security definer set search_path = public as $$
  select r.nickname, (select count(*)::int from letters l where l.room_id = r.id), r.created_at, r.avatar, r.decor
  from rooms r where r.id = p_room;
$$;

create or replace function public.set_room_decor(p_room uuid, p_key text, p_decor jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update rooms set decor = coalesce(p_decor, '{}'::jsonb)
  where id = p_room and owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  if not found then raise exception 'not owner'; end if;
end $$;

revoke all on function public.get_room(uuid), public.set_room_decor(uuid, text, jsonb) from public;
grant execute on function public.get_room(uuid), public.set_room_decor(uuid, text, jsonb) to anon, authenticated;
