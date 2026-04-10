-- food_suggestionsカラムをmeal_recordsに追加
alter table meal_records
  add column if not exists food_suggestions jsonb default '[]';
