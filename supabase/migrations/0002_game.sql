-- Who Drew That? — game loop schema (rounds, assignments, votes, secrets, strokes)
-- Run AFTER 0001_init.sql. Idempotent where practical.

-- ------------------------------------------------------------------
-- rooms: add game-state columns clients may safely observe
-- ------------------------------------------------------------------
alter table public.rooms add column if not exists phase text not null default 'lobby';
alter table public.rooms add column if not exists current_round int not null default 0;
alter table public.rooms add column if not exists total_rounds int not null default 0;
alter table public.rooms add column if not exists turn_order jsonb not null default '[]'::jsonb;
alter table public.rooms add column if not exists turn_index int not null default 0;
alter table public.rooms add column if not exists phase_ends_at timestamptz;
alter table public.rooms add column if not exists reveal jsonb;

-- ------------------------------------------------------------------
-- Secret / server-only tables (RLS on, NO anon policy => default deny).
-- Only the service-role client (API routes) reads/writes these.
-- ------------------------------------------------------------------
create table if not exists public.rounds (
  id            uuid primary key default gen_random_uuid(),
  room_code     text not null references public.rooms(code) on delete cascade,
  round_number  int not null,
  crew_word     text not null,
  imposter_word text not null,
  imposter_ids  jsonb not null default '[]'::jsonb,
  accused_id    uuid,
  outcome       text,
  created_at    timestamptz not null default now(),
  unique (room_code, round_number)
);

create table if not exists public.assignments (
  round_id   uuid not null references public.rounds(id) on delete cascade,
  player_id  uuid not null,
  role       text not null check (role in ('crew', 'imposter')),
  word       text not null,
  primary key (round_id, player_id)
);

create table if not exists public.votes (
  round_id   uuid not null references public.rounds(id) on delete cascade,
  voter_id   uuid not null,
  target_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (round_id, voter_id)
);

create table if not exists public.player_secrets (
  player_id  uuid primary key,
  room_code  text not null,
  secret     text not null,
  created_at timestamptz not null default now()
);

alter table public.rounds         enable row level security;
alter table public.assignments    enable row level security;
alter table public.votes          enable row level security;
alter table public.player_secrets enable row level security;
-- (no policies => anon key is denied; service role bypasses RLS)

-- ------------------------------------------------------------------
-- strokes: the shared drawing. Non-secret (everyone sees the canvas),
-- so permissive like the lobby tables, and realtime-published.
-- ------------------------------------------------------------------
create table if not exists public.strokes (
  id           uuid primary key default gen_random_uuid(),
  room_code    text not null,
  round_number int not null default 0,
  player_id    uuid not null,
  seq          bigint not null,
  color        text not null default '#2b2a28',
  points       jsonb not null,
  created_at   timestamptz not null default now()
);
-- (round_number is public via rooms.current_round; lets clients filter per round)
alter table public.strokes add column if not exists round_number int not null default 0;
create index if not exists strokes_room_idx on public.strokes (room_code, round_number, seq);

alter table public.strokes enable row level security;
drop policy if exists strokes_all on public.strokes;
create policy strokes_all on public.strokes
  for all to anon, authenticated using (true) with check (true);

alter table public.strokes replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'strokes'
  ) then
    alter publication supabase_realtime add table public.strokes;
  end if;
end $$;
