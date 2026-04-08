-- ① 体重・体組成記録テーブル
create table if not exists body_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  weight numeric not null,
  bodyfat numeric,
  muscle_mass numeric,
  recorded_at timestamptz default now()
);

-- ② 水分摂取記録テーブル
create table if not exists water_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount_ml integer not null,
  recorded_at timestamptz default now()
);

-- ③ 運動記録テーブル
create table if not exists exercise_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  exercise_name text not null,
  duration_min integer,
  calories_burned integer,
  intensity text,
  memo text,
  recorded_at timestamptz default now()
);

-- ④ サプリメント記録テーブル
create table if not exists supplement_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  supp_name text not null,
  amount text,
  timing text,
  memo text,
  recorded_at timestamptz default now()
);

-- RLS設定
alter table body_records enable row level security;
alter table water_records enable row level security;
alter table exercise_records enable row level security;
alter table supplement_records enable row level security;

create policy "自分の体重記録のみ" on body_records for all using (auth.uid() = user_id);
create policy "自分の水分記録のみ" on water_records for all using (auth.uid() = user_id);
create policy "自分の運動記録のみ" on exercise_records for all using (auth.uid() = user_id);
create policy "自分のサプリ記録のみ" on supplement_records for all using (auth.uid() = user_id);

create policy "管理者は体重記録閲覧" on body_records for select using (exists (select 1 from admins where id = auth.uid()));
create policy "管理者は運動記録閲覧" on exercise_records for select using (exists (select 1 from admins where id = auth.uid()));

-- インデックス
create index body_records_user_date on body_records(user_id, recorded_at);
create index water_records_user_date on water_records(user_id, recorded_at);
create index exercise_records_user_date on exercise_records(user_id, recorded_at);
