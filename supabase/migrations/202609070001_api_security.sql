begin;

-- Run as the project owner. No existing review rows are changed.
alter table public."Cafe Reviews" enable row level security;
revoke all on table public."Cafe Reviews" from public, anon, authenticated;
-- Table REVOKE does not remove any pre-existing column-level grants.
do $$
declare col record; sequence_name text;
begin
  for col in select attname from pg_attribute
    where attrelid = 'public."Cafe Reviews"'::regclass and attnum > 0 and not attisdropped
  loop
    execute format('revoke all (%I) on table public."Cafe Reviews" from public, anon, authenticated', col.attname);
  end loop;
  sequence_name := pg_get_serial_sequence('public."Cafe Reviews"', 'id');
  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to service_role', sequence_name);
  end if;
end $$;
grant select, insert on table public."Cafe Reviews" to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.api_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
create index if not exists api_rate_limits_expiry on private.api_rate_limits(reset_at);
revoke all on private.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(p_key text, p_limit integer, p_window_ms integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
  now_at timestamptz := clock_timestamp();
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_ms is null or p_window_ms < 1000 or p_window_ms > 3600000 then
    raise exception 'Invalid limit';
  end if;
  -- One atomic upsert serializes contenders across all server instances.
  insert into private.api_rate_limits as bucket(key, count, reset_at)
  values (p_key, 1, now_at + p_window_ms * interval '1 millisecond')
  on conflict (key) do update set
    count = case when bucket.reset_at <= now_at then 1 else least(bucket.count + 1, p_limit + 1) end,
    reset_at = case when bucket.reset_at <= now_at then now_at + p_window_ms * interval '1 millisecond' else bucket.reset_at end
  returning count <= p_limit into allowed;
  -- Bound cleanup work; expire old IP hashes without retaining raw addresses.
  delete from private.api_rate_limits where key in (
    select key from private.api_rate_limits where reset_at < now_at - interval '1 hour' limit 100
  );
  return allowed;
end;
$$;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

commit;
