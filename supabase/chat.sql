-- 마을 광장 채팅. 최근 10분 메시지만 보이고, 새 메시지가 들어올 때 10분 지난 메시지를 지움.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
alter table public.chat_messages enable row level security;

drop policy if exists "read recent chat" on public.chat_messages;
create policy "read recent chat" on public.chat_messages for select to anon, authenticated
  using (created_at > now() - interval '10 minutes');

drop policy if exists "post chat" on public.chat_messages;
create policy "post chat" on public.chat_messages for insert to anon, authenticated
  with check (true);

-- 보내는 시각은 서버 시간으로 고정하고, 10분 지난 메시지는 정리
create or replace function public.chat_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.nickname := btrim(new.nickname);
  new.body := btrim(new.body);
  delete from chat_messages where created_at < now() - interval '10 minutes';
  return new;
end $$;
drop trigger if exists chat_before_insert on public.chat_messages;
create trigger chat_before_insert before insert on public.chat_messages
  for each row execute function public.chat_before_insert();

-- 실시간 전송 켜기
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
