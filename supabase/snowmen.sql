-- 눈사람: 광장에 만든 눈사람. 24시간 동안 모두에게 보이고, 새로 만들 때 24시간 지난 것은 정리.
create table if not exists public.snowmen (
  id uuid primary key default gen_random_uuid(),
  x real not null check (x between -8 and 8),
  z real not null check (z between -8 and 8),
  ry real not null default 0,
  name text not null default '익명' check (char_length(name) between 1 and 12),
  scarf text not null default '#d33a3a' check (scarf ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.snowmen enable row level security;
drop policy if exists "read recent snowmen" on public.snowmen;
create policy "read recent snowmen" on public.snowmen for select to anon, authenticated
  using (created_at > now() - interval '24 hours');
drop policy if exists "build snowman" on public.snowmen;
create policy "build snowman" on public.snowmen for insert to anon, authenticated with check (true);

create or replace function public.snowman_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  delete from snowmen where created_at < now() - interval '24 hours';
  return new;
end $$;
drop trigger if exists snowman_before_insert on public.snowmen;
create trigger snowman_before_insert before insert on public.snowmen
  for each row execute function public.snowman_before_insert();
