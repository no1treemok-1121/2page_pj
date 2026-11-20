-- 🔑 내 방 열쇠: 방 주인이 직접 정한 아이디 + 비밀번호로 다른 기기에서도 내 방을 다시 찾음
-- - 비밀번호는 bcrypt 해시(pw_hash)만 저장
-- - 주인 열쇠(owner_key)는 비밀번호로 암호화(key_box)해서 저장 → 비밀번호를 아는 사람만 꺼낼 수 있음
-- - 비밀번호 5번 틀리면 그 아이디는 10분 동안 잠김 (마구 넣어 보기 방지)
-- - 테이블 직접 접근 불가(RLS 정책 없음), 아래 함수로만 사용

create table if not exists public.room_logins (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  login_id text not null unique,
  pw_hash text not null,
  key_box text not null,
  fails int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.room_logins enable row level security;
revoke all on public.room_logins from anon, authenticated;

-- 주인이 아이디·비밀번호 만들기/바꾸기
create or replace function public.set_room_login(p_room uuid, p_key text, p_login text, p_pw text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_login text := lower(trim(p_login));
begin
  if not exists (select 1 from rooms where id = p_room and owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not owner';
  end if;
  if v_login !~ '^[a-z0-9_가-힣]{3,16}$' then raise exception 'bad login'; end if;
  if char_length(coalesce(p_pw, '')) < 4 or char_length(p_pw) > 30 then raise exception 'bad pw'; end if;
  if exists (select 1 from room_logins where login_id = v_login and room_id <> p_room) then raise exception 'login taken'; end if;
  insert into room_logins (room_id, login_id, pw_hash, key_box)
  values (p_room, v_login, crypt(p_pw, gen_salt('bf', 8)), encode(pgp_sym_encrypt(p_key, p_pw), 'base64'))
  on conflict (room_id) do update
    set login_id = excluded.login_id, pw_hash = excluded.pw_hash, key_box = excluded.key_box, fails = 0, locked_until = null;
  return v_login;
end $$;

-- 주인에게 지금 아이디 알려 주기 (없으면 null)
create or replace function public.get_room_login(p_room uuid, p_key text)
returns text
language sql stable security definer set search_path = public as $$
  select l.login_id from room_logins l join rooms r on r.id = l.room_id
  where l.room_id = p_room and r.owner_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
$$;

-- 아이디·비밀번호로 내 방 찾기. status: ok / fail / locked (실패해도 기록이 남도록 예외 대신 결과로 알려 줌)
create or replace function public.room_login(p_login text, p_pw text)
returns table (status text, room_id uuid, owner_key text, nickname text, left_tries int)
language plpgsql security definer set search_path = public, extensions as $$
declare r room_logins; n int;
begin
  select * into r from room_logins where login_id = lower(trim(p_login)) for update;
  if not found then
    return query select 'fail'::text, null::uuid, null::text, null::text, null::int; return;
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return query select 'locked'::text, null::uuid, null::text, null::text, 0; return;
  end if;
  if r.pw_hash <> crypt(coalesce(p_pw, ''), r.pw_hash) then
    n := r.fails + 1;
    update room_logins set fails = case when n >= 5 then 0 else n end,
      locked_until = case when n >= 5 then now() + interval '10 minutes' else null end
    where room_logins.room_id = r.room_id;
    return query select (case when n >= 5 then 'locked' else 'fail' end)::text, null::uuid, null::text, null::text, greatest(0, 5 - n); return;
  end if;
  update room_logins set fails = 0, locked_until = null where room_logins.room_id = r.room_id;
  return query select 'ok'::text, r.room_id, pgp_sym_decrypt(decode(r.key_box, 'base64'), p_pw)::text,
    (select ro.nickname from rooms ro where ro.id = r.room_id), 5;
end $$;

revoke all on function public.set_room_login(uuid, text, text, text), public.get_room_login(uuid, text), public.room_login(text, text) from public;
grant execute on function public.set_room_login(uuid, text, text, text), public.get_room_login(uuid, text), public.room_login(text, text) to anon, authenticated;
