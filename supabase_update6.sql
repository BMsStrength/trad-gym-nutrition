-- マイサプリテーブル（よく使うサプリを登録）
create table if not exists my_supplements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  product_id text,
  supp_name text not null,
  brand text,
  serving_unit text,
  servings_options jsonb default '[1,2]',
  default_servings numeric default 1,
  default_timing text default '運動後',
  nutrients jsonb,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table my_supplements enable row level security;
create policy "自分のマイサプリのみ" on my_supplements
  for all using (auth.uid() = user_id);

create index my_supplements_user on my_supplements(user_id, sort_order);
