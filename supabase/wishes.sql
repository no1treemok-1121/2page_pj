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
