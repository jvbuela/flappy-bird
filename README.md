# Flappy Bird

A tiny web Flappy Bird clone — a single static `index.html` using `<canvas>` and
vanilla JavaScript. No dependencies, no build step.

## Play

- **Flap:** click, tap, or press `Space` / `↑`
- Pass between the pipes to score. Hitting a pipe or the ground ends the game.
- Best scores are tracked **per difficulty as a global all-time record** (shared
  across everyone, with the holder's name) when Supabase is set up; otherwise
  they fall back to a per-device best saved in the browser (`localStorage`).
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
4. **(Optional) Global all-time best scores.** To show a per-mode all-time best
   shared across everyone, open the Supabase **SQL editor** and run:
   ```sql
   create table if not exists public.best_scores (
     mode text primary key,
     score integer not null default 0,
     name text,
     updated_at timestamptz not null default now()
   );
   alter table public.best_scores enable row level security;
   grant select on public.best_scores to anon;
   create policy "read best scores" on public.best_scores for select using (true);
   insert into public.best_scores (mode, score) values ('easy',0),('medium',0),('hard',0)
     on conflict (mode) do nothing;

   create or replace function public.submit_best(p_mode text, p_score integer, p_name text)
   returns table(mode text, score integer, name text)
   language plpgsql security definer as $$
   begin
     update public.best_scores b set score = p_score, name = p_name, updated_at = now()
       where b.mode = p_mode and p_score > b.score;
     return query select b.mode, b.score, b.name from public.best_scores b where b.mode = p_mode;
   end; $$;
   grant execute on function public.submit_best(text, integer, text) to anon;
   ```
   Without this table the game still works — it just falls back to a per-device
   best stored in the browser.

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
