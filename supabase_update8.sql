-- 1日の食事総評テーブル
create table if not exists daily_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  review_date date not null,
  review      text,
  tomorrow_suggestions jsonb default '[]',
  created_at  timestamptz default now(),
  unique(user_id, review_date)
);
alter table daily_reviews enable row level security;
drop policy if exists "自分の総評のみ" on daily_reviews;
create policy "自分の総評のみ"
  on daily_reviews for all using (auth.uid() = user_id);
