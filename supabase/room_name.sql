-- ✏️ 방 이름 바꾸기 (방 이름 = 주인 닉네임, 주인 열쇠가 있어야 바뀜). 1~12자
create or replace function public.set_room_name(p_room uuid, p_key text, p_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare v text := trim(coalesce(p_name, ''));
begin
  if char_length(v) < 1 or char_length(v) > 12 then raise exception 'bad name'; end if;
  update rooms set nickname = v
  where id = p_room and owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  if not found then raise exception 'not owner'; end if;
end $$;

revoke all on function public.set_room_name(uuid, text, text) from public;
grant execute on function public.set_room_name(uuid, text, text) to anon, authenticated;
