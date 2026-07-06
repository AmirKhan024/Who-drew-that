-- Who Drew That? — hardening. Run AFTER 0002_game.sql.
-- Strokes may now only be INSERTED by the server (service role, turn-checked in
-- /api/game/stroke). Anon clients keep SELECT so realtime render + history work.

drop policy if exists strokes_all on public.strokes;

drop policy if exists strokes_select on public.strokes;
create policy strokes_select on public.strokes
  for select to anon, authenticated using (true);

-- No anon INSERT/UPDATE/DELETE policy => those are denied for the anon key.
-- The service-role client bypasses RLS for validated inserts.
