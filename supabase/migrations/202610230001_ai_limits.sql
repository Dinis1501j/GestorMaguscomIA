-- Limite persistente e atómico, separado do conteúdo do catálogo.
create table if not exists public.magus_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  requests integer not null default 0
);
alter table public.magus_ai_usage enable row level security;
revoke all on public.magus_ai_usage from anon, authenticated;
create or replace function public.magus_ai_take_slot() returns boolean
language plpgsql security definer set search_path = public as $$
declare accepted boolean;
begin
  if auth.uid() is null or not public.magus_is_admin() then return false; end if;
  insert into public.magus_ai_usage as usage (user_id, window_start, requests)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update set
    requests = case when usage.window_start <= now()-interval '1 hour' then 1 else usage.requests+1 end,
    window_start = case when usage.window_start <= now()-interval '1 hour' then now() else usage.window_start end
  where usage.window_start <= now()-interval '1 hour' or usage.requests < 20
  returning true into accepted;
  return coalesce(accepted,false);
end;
$$;
revoke all on function public.magus_ai_take_slot() from public;
grant execute on function public.magus_ai_take_slot() to authenticated;
