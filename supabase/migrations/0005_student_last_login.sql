-- =============================================================================
-- STEM QUEST — 0005_student_last_login.sql
-- Admin "Last Login" column (Batch 3, Issue #12).
--
-- student_sessions carries hashed login tokens and is deliberately locked
-- down with RLS enabled and ZERO policies (D-040, see 0001_initial_schema.sql
-- §5 — "backend only"). This migration does NOT add a blanket admin SELECT
-- policy on that table (that would expose token_hash/ip_address/user_agent to
-- every admin's browser session). Instead it exposes only the two columns the
-- admin console needs — student_id and their most recent login timestamp —
-- through a SECURITY DEFINER function, gated by the same public.is_admin()
-- check every other admin-only surface uses. Callable via PostgREST as an RPC:
--   client.rpc('get_student_last_logins')
-- Idempotent and non-destructive: re-running is safe.
-- =============================================================================

begin;

create or replace function public.get_student_last_logins()
returns table (student_id bigint, last_login_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select ss.student_id, max(ss.created_at) as last_login_at
  from public.student_sessions ss
  where public.is_admin()
  group by ss.student_id;
$$;

revoke all on function public.get_student_last_logins() from public;
grant execute on function public.get_student_last_logins() to authenticated;

commit;
