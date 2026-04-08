-- ① プロフィールテーブル
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  gender text not null,
  age integer not null,
  height numeric not null,
  weight numeric not null,
  bodyfat numeric,
  activity numeric not null,
  goal text not null,
  tdee integer,
  "targetCal" integer,
  "pfcP" integer,
  "pfcF" integer,
  "pfcC" integer,
  status text not null default 'pending',
  approved_at timestamptz,
  suspended_at timestamptz,
  memo text,
  updated_at timestamptz default now()
);

-- ② 管理者テーブル
create table admins (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  created_at timestamptz default now()
);

-- ③ 食事記録テーブル
create table meal_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  meal_name text not null,
  total_cal integer not null,
  protein numeric,
  fat numeric,
  carbs numeric,
  vitamins jsonb,
  minerals jsonb,
  advice text,
  note text,
  recorded_at timestamptz default now()
);

-- ④ RLS
alter table profiles enable row level security;
alter table meal_records enable row level security;
alter table admins enable row level security;

create policy "自分のプロフィールのみ" on profiles
  for all using (auth.uid() = id);

create policy "自分の食事記録のみ" on meal_records
  for all using (auth.uid() = user_id);

create policy "管理者は全プロフィール閲覧" on profiles
  for select using (exists (select 1 from admins where id = auth.uid()));

create policy "管理者はステータス更新可能" on profiles
  for update using (exists (select 1 from admins where id = auth.uid()));

create policy "管理者は全食事記録閲覧" on meal_records
  for select using (exists (select 1 from admins where id = auth.uid()));

create policy "管理者のみ参照" on admins
  for all using (auth.uid() = id);

-- ⑤ インデックス
create index meal_records_user_date on meal_records(user_id, recorded_at);

-- ⑥ 管理者登録（トレーナーが新規登録した後に実行）
-- insert into admins (id, email)
-- select id, email from auth.users where email = 'trainer@tradgym.com';
