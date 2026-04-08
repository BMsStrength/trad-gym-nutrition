-- blood_test_records テーブル（血液検査記録）
create table if not exists blood_test_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  summary text,
  items jsonb,
  nutrition_advice jsonb,
  requires_medical boolean default false,
  medical_reason text,
  recorded_at timestamptz default now()
);

-- RLS設定
alter table blood_test_records enable row level security;

create policy "自分の血液検査記録のみ" on blood_test_records
  for all using (auth.uid() = user_id);

create policy "管理者は全血液検査記録閲覧" on blood_test_records
  for select using (exists (select 1 from admins where id = auth.uid()));

-- インデックス
create index blood_test_records_user_date on blood_test_records(user_id, recorded_at);
