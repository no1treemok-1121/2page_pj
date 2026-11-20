-- 캐릭터(아바타): "동물:색:장식" 형식 문자열 (예: cat:#ffd36b:santa). 없으면 null.
do $$ begin
  alter table public.wishes add column if not exists avatar text;
  alter table public.chat_messages add column if not exists avatar text;
  alter table public.rooms add column if not exists avatar text;
end $$;
alter table public.wishes drop constraint if exists wishes_avatar_check;
alter table public.wishes add constraint wishes_avatar_check check (avatar is null or avatar ~ '^[a-z]{2,10}:#[0-9a-f]{6}:[a-z]{2,10}$');
alter table public.chat_messages drop constraint if exists chat_avatar_check;
alter table public.chat_messages add constraint chat_avatar_check check (avatar is null or avatar ~ '^[a-z]{2,10}:#[0-9a-f]{6}:[a-z]{2,10}$');
alter table public.rooms drop constraint if exists rooms_avatar_check;
alter table public.rooms add constraint rooms_avatar_check check (avatar is null or avatar ~ '^[a-z]{2,10}:#[0-9a-f]{6}:[a-z]{2,10}$');

-- 방 정보에 캐릭터 포함 (반환 형식이 바뀌어 다시 만듦)
drop function if exists public.get_room(uuid);
create function public.get_room(p_room uuid)
returns table (nickname text, letter_count int, created_at timestamptz, avatar text)
language sql stable security definer set search_path = public as $$
  select r.nickname, (select count(*)::int from letters l where l.room_id = r.id), r.created_at, r.avatar
  from rooms r where r.id = p_room;
$$;

-- 방 주인이 캐릭터 바꾸기
create or replace function public.set_room_avatar(p_room uuid, p_key text, p_avatar text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update rooms set avatar = p_avatar
  where id = p_room and owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  if not found then raise exception 'not owner'; end if;
end $$;

revoke all on function public.get_room(uuid), public.set_room_avatar(uuid, text, text) from public;
grant execute on function public.get_room(uuid), public.set_room_avatar(uuid, text, text) to anon, authenticated;
