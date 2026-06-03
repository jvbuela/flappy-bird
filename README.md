# Flappy Bird

A tiny web Flappy Bird clone — a single static `index.html` using `<canvas>` and
vanilla JavaScript. No dependencies, no build step.

## Play

- **Flap:** click, tap, or press `Space` / `↑`
- Pass between the pipes to score. Hitting a pipe or the ground ends the game.
- Best scores show as a **per-difficulty global top-3 "Flappy Best" podium**
  (shared across everyone, with names) when Supabase is set up; otherwise they
  fall back to a per-device best saved in the browser (`localStorage`). Set the
  name used on the board in the **Your name** field below the game.
- The game gets harder as you score: faster pipes, narrowing gaps, tighter
  spacing, plus **moving pipes** (score ≥ 8) and **wide pipes** (score ≥ 14).
- Pick a **Background** (mountains / clouds / ocean) and a **Player** under the
  canvas; both choices are remembered.

## Choose your player

Use one of your own photos as the bird. See [`players/README.md`](players/README.md):
drop an image in `players/` and add a line to the `PLAYERS` array in
`index.html`. The photo is circle-cropped and the game adds flapping wings.

## Online multiplayer (live "ghost race")

Players on different devices fly the **same course** (the host streams the pipes,
so everyone sees an identical map) and see each other's birds live. One player
creates a room and shares the **room code**; everyone who joins races together.
Keep flying after others crash — the race runs until **everyone is out**, and the
**highest score wins**.

It uses **Supabase Realtime** (a server relay, so it works across networks
without any peer-to-peer/firewall issues). Setup is one time and free:

1. Create a free project at <https://supabase.com>.
2. **Project Settings → API**: copy the **Project URL** and the **anon public**
   key.
3. Paste both into the marked spot near the top of the `<script>` in
   `index.html`:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
   (The anon key is meant to be public — it only allows realtime broadcast and
   the read/submit of best scores below, no private data.)
4. **(Optional) Global "Flappy Best" leaderboard.** To show a per-mode top-3
   podium shared across everyone, open the Supabase **SQL editor** and run:
   ```sql
   drop function if exists public.submit_best(text, integer, text);
   drop table if exists public.best_scores;

   create table public.best_scores (
     mode text not null,
     name text not null,
     score integer not null default 0,
     updated_at timestamptz not null default now(),
     primary key (mode, name)
   );
   alter table public.best_scores enable row level security;
   grant select on public.best_scores to anon;
   create policy "read best scores" on public.best_scores for select using (true);

   -- one row per (mode, name); keep the player's highest score
   create or replace function public.submit_best(p_mode text, p_score integer, p_name text)
   returns void language plpgsql security definer as $$
   begin
     insert into public.best_scores (mode, name, score) values (p_mode, p_name, p_score)
     on conflict (mode, name)
     do update set score = greatest(public.best_scores.score, excluded.score), updated_at = now();
   end; $$;
   grant execute on function public.submit_best(text, integer, text) to anon;
   ```
   Without this table the game still works — it just falls back to a per-device
   best stored in the browser. (If you ran an earlier single-record version, this
   block drops and recreates the table, resetting any test scores.)

To play: click **🌐 Multiplayer**, enter a name, **Create room** (or **Join**
with a code), then the host clicks **Start race**.

Notes & limits:
- The host's **Difficulty** applies to everyone; each player flies their own
  selected **Player** bird.
- Best for ~2–6 players. Players self-report position/score (no anti-cheat) —
  fine for casual play.
- On the Free plan a project pauses after ~1 week idle; just click **Restore**
  in the Supabase dashboard.
- Multiplayer needs the page served over **http(s)** (Vercel, or `npx serve`
  locally) so the realtime library can load — `file://` works for solo only.

## Run locally

Just open `index.html` in any modern browser for solo play. For multiplayer,
serve the folder (e.g. `npx serve`) or use the Vercel URL.

## Deploy

Hosted on Vercel as a static site. Any push to `main` auto-redeploys.

**Live demo:** https://flappy-bird-ni-mark.vercel.app/
