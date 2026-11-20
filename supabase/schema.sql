-- 2Page 데이터베이스 구조 (새 Supabase 프로젝트용, 처음부터 시작)
-- src/integrations/supabase/types.ts 의 테이블 구성을 그대로 따름.
-- 여러 번 실행해도 안전하도록 if not exists / or replace 사용.

-- ───────────────────────── 공용 함수 ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── 기본 데이터 테이블 ─────────────────────────
create table if not exists public.categories (
  id serial primary key,
  name text not null unique,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.banned_words (
  id serial primary key,
  word text not null unique,
  category text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.legal_documents (
  id serial primary key,
  doc_type text not null,            -- 'terms' | 'privacy' 등
  version text not null,
  content text not null,
  effective_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

-- ───────────────────────── 회원 ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (nickname ~ '^[가-힣a-zA-Z0-9]{2,10}$'),
  nickname_changed_at timestamptz,
  invite_code text unique,
  invite_used int default 0,
  invited_by uuid references public.profiles(id) on delete set null,
  is_subscribed boolean default false,
  sub_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.invite_codes (
  code text primary key,
  owner_id uuid references public.profiles(id) on delete cascade,
  used_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 소셜 로그인으로 처음 가입하면 프로필과 초대 코드를 자동으로 만듦
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_nick text;
  new_code text;
begin
  loop
    new_nick := '익명' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles p where p.nickname = new_nick);
  end loop;
  loop
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.invite_codes c where c.code = new_code);
  end loop;
  insert into public.profiles (id, nickname, invite_code) values (new.id, new_nick, new_code);
  insert into public.invite_codes (code, owner_id) values (new_code, new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── 게시글 ─────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id int references public.categories(id) on delete set null,
  content text not null check (char_length(content) between 1 and 500),
  image_urls text[],
  duration_hours int default 24,
  expires_at timestamptz not null,
  like_count int default 0,
  comment_count int default 0,
  report_count int default 0,
  is_blind boolean default false,
  blinded_at timestamptz,
  is_locked boolean default false,
  locked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists posts_feed_idx on public.posts (expires_at, created_at desc) where is_blind = false;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  image_url text,
  report_count int default 0,
  is_blind boolean default false,
  created_at timestamptz default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.comment_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  used_date date not null default current_date,
  used_count int default 0,
  unique (user_id, used_date)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                -- 'comment' | 'like' 등
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text,
  created_at timestamptz default now(),
  unique (reporter_id, target_type, target_id)
);

-- ───────────────────────── 숫자 자동 집계 ─────────────────────────
create or replace function public.sync_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = coalesce(like_count, 0) + 1 where id = new.post_id;
  else
    update posts set like_count = greatest(coalesce(like_count, 0) - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists likes_count on public.likes;
create trigger likes_count after insert or delete on public.likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = coalesce(comment_count, 0) + 1 where id = new.post_id;
  else
    update posts set comment_count = greatest(coalesce(comment_count, 0) - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- ───────────────────────── 사용자가 직접 못 바꾸는 값 보호 ─────────────────────────
-- 앱(로그인 사용자)이 좋아요 수·구독 여부 같은 값을 임의로 바꾸지 못하게 함.
-- 숫자 집계 트리거나 대시보드(관리자)에서 바꾸는 것은 허용.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.invite_code := old.invite_code;
    new.invite_used := old.invite_used;
    new.invited_by := old.invited_by;
    new.is_subscribed := old.is_subscribed;
    new.sub_expires_at := old.sub_expires_at;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.protect_post_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.like_count := 0;
      new.comment_count := 0;
      new.report_count := 0;
      new.is_blind := false;
      new.blinded_at := null;
      new.created_at := now();
    else
      new.user_id := old.user_id;
      new.like_count := old.like_count;
      new.comment_count := old.comment_count;
      new.report_count := old.report_count;
      new.is_blind := old.is_blind;
      new.blinded_at := old.blinded_at;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_protect on public.posts;
create trigger posts_protect before insert or update on public.posts
  for each row execute function public.protect_post_columns();

create or replace function public.protect_comment_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.report_count := 0;
    new.is_blind := false;
    new.created_at := now();
  end if;
  return new;
end $$;
drop trigger if exists comments_protect on public.comments;
create trigger comments_protect before insert on public.comments
  for each row execute function public.protect_comment_columns();

-- ───────────────────────── 접근 규칙 (RLS) ─────────────────────────
alter table public.categories enable row level security;
alter table public.banned_words enable row level security;
alter table public.legal_documents enable row level security;
alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.comment_daily_usage enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- 누구나 읽기 (관리는 대시보드에서)
drop policy if exists "read categories" on public.categories;
create policy "read categories" on public.categories for select using (true);
drop policy if exists "read banned words" on public.banned_words;
create policy "read banned words" on public.banned_words for select using (true);
drop policy if exists "read legal docs" on public.legal_documents;
create policy "read legal docs" on public.legal_documents for select using (true);

-- 프로필: 로그인한 사람은 닉네임을 볼 수 있고, 자기 것만 수정
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 초대 코드: 자기 코드만 보기
drop policy if exists "read own invite codes" on public.invite_codes;
create policy "read own invite codes" on public.invite_codes for select to authenticated
  using (owner_id = auth.uid());

-- 게시글: 로그인한 사람은 가려지지 않은 글(또는 자기 글)을 보고, 자기 글만 쓰기·수정·삭제
drop policy if exists "read posts" on public.posts;
create policy "read posts" on public.posts for select to authenticated
  using (is_blind = false or user_id = auth.uid());
drop policy if exists "insert own posts" on public.posts;
create policy "insert own posts" on public.posts for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts for delete to authenticated
  using (user_id = auth.uid());

-- 댓글
drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments for select to authenticated
  using (is_blind = false or user_id = auth.uid());
drop policy if exists "insert own comments" on public.comments;
create policy "insert own comments" on public.comments for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "delete own comments" on public.comments;
create policy "delete own comments" on public.comments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "read own comment usage" on public.comment_daily_usage;
create policy "read own comment usage" on public.comment_daily_usage for select to authenticated
  using (user_id = auth.uid());

-- 좋아요
drop policy if exists "read likes" on public.likes;
create policy "read likes" on public.likes for select to authenticated using (true);
drop policy if exists "insert own likes" on public.likes;
create policy "insert own likes" on public.likes for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "delete own likes" on public.likes;
create policy "delete own likes" on public.likes for delete to authenticated
  using (user_id = auth.uid());

-- 알림: 자기 알림만 보고 읽음 처리
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 신고: 넣기만 가능 (내용은 대시보드에서 확인)
drop policy if exists "insert own reports" on public.reports;
create policy "insert own reports" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ───────────────────────── 기본 데이터 ─────────────────────────
insert into public.categories (name, sort_order) values
  ('일상', 1), ('연애·관계', 2), ('모임·만남', 3)
on conflict (name) do nothing;
