# Flappy Bird — Project Documentation

A complete record of this project: what it is, how it's built, every feature, the
architecture, how to run/deploy it, and the full history of changes.

- **Live demo:** https://flappy-bird-ni-mark.vercel.app/
- **Repository:** https://github.com/jvbuela/flappy-bird (public)
- **Hosting:** Vercel (static site; every push to `main` auto-redeploys)
- **Owner:** jvbuela
- **Type:** Single-file HTML5 canvas game, vanilla JavaScript, **no build step,
  no dependencies** (except the Supabase realtime library, loaded on demand from
  a CDN only when multiplayer is used).

---

## 1. Overview

A web-based clone of Flappy Bird that grew well beyond the basics:

- Classic one-button gameplay (flap to fly through gaps in pipes).
- Progressive difficulty that ramps as your score climbs.
- Easy / Medium / Hard difficulty modes.
- Selectable **backgrounds** (mountains, clouds, ocean).
- Selectable **players** — use your own photos as the bird, with drawn flapping
  wings.
- An in-game **How to play** help panel.
- **Online multiplayer** — race friends on separate devices, seeing each other's
  birds live, on an identical pipe course (powered by Supabase Realtime).

Everything lives in one file: **`index.html`** (HTML + CSS + JS inline, ~1250
lines).

---

## 2. Tech stack & decisions

| Concern | Choice | Why |
|---|---|---|
| Rendering | HTML5 `<canvas>` 2D | Simple, dependency-free, perfect for a 2D game |
| Language | Vanilla JavaScript | No build/tooling needed; instant static deploy |
| Hosting | Vercel (static) | Free, auto-deploy on push, HTTPS |
| Source control | Git + GitHub (`gh` CLI) | Standard; Vercel imports from GitHub |
| Realtime (multiplayer) | **Supabase Realtime** (broadcast channels) | Server-relayed over WebSocket → works across networks (no WebRTC/NAT issues), free tier, one-time setup |
| Persistence | `localStorage` + Supabase | Local: chosen background/player/difficulty/name and a per-mode best cache. Global all-time best scores (per mode) live in a Supabase table |

**Why Supabase over peer-to-peer (Trystero):** the players are on different
networks. Peer-to-peer (WebRTC) can fail on strict/locked-down Wi-Fi without a
TURN relay. Supabase relays messages through its servers, so it connects
anywhere there's internet. Trade-off: it needs one free account + keys in the
file (the publishable/anon key is safe to expose in client code).

---

## 3. File structure

```
CodeTest2/
├── index.html          # The entire game (HTML + CSS + inline <script>)
├── og-image.png        # 1200x630 social link-preview banner
├── README.md           # Player-facing readme + Supabase setup + deploy notes
├── PROJECT.md          # This document
├── .gitignore          # node_modules, .vercel, OS cruft
├── tools/
│   └── make-og.js      # Regenerates og-image.png (pure Node, no deps)
└── players/
    ├── README.md       # How to add a player photo
    ├── cliar.png       # Player photos (used as bird skins)
    ├── jkdgu.png
    ├── kicmo.png
    ├── mlacu.png
    ├── lpaab.png
    └── jumong.png      # (a dog — mascot)
```

---

## 4. Features in detail

### 4.1 Core gameplay
- **Flap:** click, tap, or `Space` / `↑`.
- Bird physics: gravity (`GRAVITY`), upward impulse on flap (`FLAP`), a
  terminal-velocity cap (`MAX_FALL`) so descents level off instead of
  plummeting, and rotation that follows velocity. **Tuned to mirror the
  original Flappy Bird:** the reference game's constants (30 fps, 288×512;
  gravity 1, flap -9, terminal 10) are converted to this game's 60 fps and
  600px height, preserving its hang time (~0.3s to apex) and jump-height-to-gap
  ratio (~40%). Small, repeated taps — not one big hop per gap.
- In multiplayer the bird **auto-flaps once at "GO"** (when the countdown hits
  zero) so a slightly late first tap doesn't drop you instantly. Solo has no
  countdown — it starts on your first flap from `READY`.
- Pipes scroll right→left; pass through the gap to score. Hitting a pipe, the
  ground, or (clamped) the ceiling ends the run.
- **Best scores** are a **per-mode global top-3 leaderboard** — the
  "🏆 Flappy Best! — ROC Spotlight Award / Beat me if you can!" podium shown on
  the READY/GAME OVER screens (`drawLeaderboard`). Supabase stores one row per
  player per mode (their personal best); the client fetches and ranks the top 3
  for the current difficulty (🥇🥈🥉). A per-mode `localStorage` cache
  (`flappyBest:<mode>`) is the offline/paused-project fallback (shows the local
  best as a single entry), and the old single `flappyBest` value is migrated into
  the active mode on first load.
- **Player name** is set via a "Your name" field on the main page (for solo) or
  the multiplayer lobby — both bound to the shared `flappyName` key — and is what
  appears on the leaderboard (falls back to the player name / `anon` if blank).
- States: `READY` → `PLAYING` → `OVER` (`STATE` enum).

### 4.2 Progressive difficulty
As `progress` rises (score in solo; shared course index online), the game ramps,
all values capped:
- Speed increases; gap shrinks; pipe spacing tightens.
- **Moving pipes** unlock (gap oscillates vertically).
- **Wide pipes** unlock (thicker pipes).
- On-screen **LV** indicator + brief **unlock banners** ("↕ Moving pipes!",
  "▭ Wide pipes!", "⚡ Level n").

### 4.3 Difficulty modes (Easy / Medium / Hard)
A vertical picker beside the canvas. Each mode scales the whole ramp via the
`MODES` config (`gap`, `gapDrop`, `minGap`, `speed`, `speedRamp`, `maxSpeed`,
`spacing`, `spacingDrop`, `minSpacing`, `moveAt`, `wideAt`). Saved as
`flappyMode`. In multiplayer the **host's** mode applies to everyone.

### 4.4 Backgrounds & night mode
Picker for **mountains / clouds / ocean**, each drawn with canvas primitives
(layered mountains + snow caps + sun; fluffy clouds; animated ocean waves).
Saved as `flappyBg`.

A **🌙 Night** toggle (saved as `flappyNight`) turns on a combined dark theme:
in-canvas it overrides the background with a starry night scene (`bgNight` — dark
sky gradient, fixed star field `NIGHT_STARS`, glowing moon, mountain silhouette)
and dims the ground; on the page it adds `body.dark`, darkening the chrome
(background, buttons, modals, inputs) and updating the `theme-color` meta. The
button label flips **🌙 NS Shift** (night) ↔ **☀️ SS Shift** (day);
`applyTheme()` applies the saved state on load.

### 4.5 Players (photo birds + wings)
- Driven by the `PLAYERS` array: `{ name, file }` entries. `"Classic"`
  (`file: null`) is the drawn yellow bird and the default/fallback.
- Photos are **circle-cropped** with a focal zoom (`drawCreature` → `cover`
  scale × `zoom`, anchored at `focusX`/`focusY`, default ~face-centered).
  Per-player `zoom`/`focusX`/`focusY` overrides are supported.
- The **Classic** bird is drawn to look like the original Flappy Bird: an oval
  yellow body with a white belly, a single feathered wing, a big eye, and a
  two-tone orange beak.
- **Classic** uses a single feathered wing (`drawWing`, hinged at the shoulder)
  that flaps up on a tap and settles (`bird.wing` decays). **Photo skins render
  as an "angel"**: the face medallion in the centre with **symmetric feathered
  wings** (`drawFeatherWing`, side = ∓1) drawn behind it — layered pearl-white
  feathers (a covert row over a fanned primary row) over a faint luminous bloom,
  so the wings look softly backlit. The face is framed (never covered) and the
  wings flap together with `bird.wing` (the glow brightens slightly on a flap).
- Graceful fallback: a missing/broken image silently reverts to the Classic
  bird (`p.ok` tracks load success). Saved as `flappyPlayer`.
- **To add a player:** drop an image in `players/` and add a line to `PLAYERS`
  (see `players/README.md`).

### 4.6 Help / How to play
A **❓ How to play** button opens a modal explaining single-player and the full
multiplayer flow, with tips. Closes via ✕, "Got it!", or backdrop click.

### 4.6b Sound effects
Cartoon SFX **synthesized in-code with the Web Audio API** (oscillators + gain
envelopes — no audio files, no licensing): a goofy whoosh on **flap**, ascending
**score** blips, a wobbly descending **fall/crash** scream (vibrato LFO), and
3-2-1-**GO** **countdown** beeps in multiplayer. A **🔊 Sound** button toggles
mute (saved as `flappySound`, default on); `getAudio()` lazily creates/resumes
the `AudioContext` on the first gesture. Sounds play for the **local player
only** (peers are silent). Helpers: `sfxFlap/sfxScore/sfxFall/sfxBeep` + `blip`.

### 4.7 Responsive layout
The page scales to any resolution and **scrolls instead of clipping** when the
content is taller than the viewport (previously `overflow:hidden` cut things off
and zoom was disabled). The canvas sizes itself with
`width: min(400px, 92vw, 52dvh)` + `aspect-ratio: 2/3` (fits both width and
height, never stretched). `#stage` is a 3-column grid (`1fr auto 1fr`) so the
canvas stays **page-centered** while it's flanked by two side panels: the
**Difficulty** picker in the left gutter (`.side`) and the **action buttons**
(🌐 Multiplayer / ❓ Help / 🌙 Night / 🔊 Sound) in the right gutter
(`.side.side-right`). Background, Player, and Your name sit below the canvas. On
small screens (`@media max-width:640px`) the stage switches to a column — the
side panels become centered rows (Difficulty above, actions below the canvas) —
and modals scroll internally. Pinch-zoom is re-enabled.

### 4.8 Social link preview (Open Graph)
When the link is shared (Messenger, Facebook, Twitter/X, Discord, etc.) it shows
a title, description, and a **banner image** (`og-image.png`). Meta tags
(`og:*`, `twitter:*`, `theme-color`) live in `<head>` of `index.html`.

The banner is generated by **`tools/make-og.js`** — a dependency-free Node
script (built-in `zlib` only) that:
- draws a 1200×630 Flappy Bird scene (sky, pipes, ground, clouds),
- renders the player photos as circular bird avatars (it includes a small
  8-bit PNG decoder + the game's focal-crop math),
- renders customizable title text with a built-in bitmap font.

**Customize the banner** by editing the `CONFIG` block at the top of
`tools/make-og.js` (the `lines` text and which `birds`/photos appear), then run
`node tools/make-og.js` to rewrite `og-image.png`, and commit. The current
banner reads **"PLAY FLAPPY BIRD / WITH ROC NETWORK & FRIENDS"** with the
`mlacu` and `jkdgu` photos.

The `og:image`/`og:url` are set to **absolute** URLs on
`https://flappy-bird-ni-mark.vercel.app/` (Facebook/Messenger require absolute
image URLs). After changing the banner, **re-scrape** the link in the Facebook
Sharing Debugger so cached previews refresh.

### 4.9 Online multiplayer ("ghost race")
- **🌐 Multiplayer** button → lobby modal: enter a name, **Create room** (gets a
  short code) or **Join** with a code. Player list + host's difficulty shown.
- The **host** picks difficulty and clicks **Start race**; a 3-2-1 countdown
  syncs everyone.
- Everyone flies the **same pipes** and sees the others as semi-transparent
  **ghost birds** with name tags; a live **scoreboard** (top-right) shows scores.
- **Win rule:** keep flying after others crash — the race runs until **everyone
  is out**, and the **highest score wins**. A dead player keeps spectating live;
  their bird **drops to the ground and slides off-screen** (left behind by the
  scrolling course, like the original Flappy Bird) rather than hovering in the
  shared lane.
- Host can **Rematch** (same room, fresh course) or anyone can **Leave**.

---

## 5. Multiplayer architecture (how it actually works)

Goal: players on different devices see an identical course and each other's
birds, without running a custom game server.

**Transport:** Supabase Realtime **broadcast** channel named `flappy:<CODE>`,
plus **presence** for the lobby player list. Loaded on demand:
`import("https://esm.sh/@supabase/supabase-js@2")` (so solo play never depends on
it / works offline).

**Roles:**
- **Host** = the room creator. It is the **authoritative source of the pipe
  course**.
- **Clients** = everyone else. They do **not** generate pipes.

**Per-frame model (`update()`):**
- Each client simulates **only its own bird** locally (instant, lag-free
  controls) and checks **its own collisions** against the local pipe list.
- The **host** generates + scrolls pipes (`spawnPipe`, each pipe tagged with an
  incrementing `id`) and **broadcasts a snapshot** every ~3 frames:
  `pipes { raceId, speed, course, list:[{i,x,w,g,t}] }`. The host keeps
  streaming even after its own bird dies, until the race ends.
- **Clients** apply snapshots (`onPipes`) by **reconciling pipes by `id`** (so
  scoring/passing survive), and scroll pipes by the host's `speed` between
  snapshots for smoothness. This guarantees **everyone sees the same map**.

**Messages (broadcast events):**
- `start { raceId, mode }` — host → all: begin a race with this id + difficulty.
- `pipes { raceId, speed, course, list }` — host → all: authoritative pipe
  positions (~20 Hz).
- `state { id, name, playerName, x, y, rot, wing, alive, score }` — each → all
  (~12 Hz): a player's bird, for rendering ghosts + the scoreboard. `x` is the
  fixed lane while alive; once dead it carries the bird's off-screen slide
  position so peers render the exit consistently.
- **Presence** `track({ id, name, playerName, host, mode })` — lobby identity +
  the host's chosen difficulty.

**Race lifecycle:**
- `beginRace(raceId, mode, asHost)` adopts the host's `mode`, resets, sets
  `mp.online`, `mp.pipeHost`, `mp.raceId`, starts the countdown.
- `checkRaceEnd()` ends only when **all** participants are out (`aliveCount === 0`
  with 2+ players); `endRace()` ranks by score and shows the winner.
- `mp.raceId` makes clients ignore stale messages from a previous round.

**Key multiplayer state (the `mp` object):** `online`, `inRoom`, `channel`,
`isHost`, `pipeHost`, `raceId`, `netSpeed`, `hostMode`, `code`, `name`, `alive`,
`playerName`, `peers{}`, `countdown`, `results`.

**Global best scores (Supabase DB, separate from realtime):** a `best_scores`
table with composite PK `(mode, name)` — one row per player per mode — and
columns `score`, `updated_at`. The client reads all rows on load (`fetchBests`),
groups by mode and keeps the top 3 for the podium. Writes go through a
`submit_best(p_mode, p_score, p_name)` `security definer` RPC that **upserts**,
keeping the player's higher score (`recordBest` → `submitBest`, which refetches
afterward). RLS allows reads only; the RPC is the sole write path (best-effort —
failures fall back to the local `flappyBest:<mode>` cache, so solo/offline play is
unaffected). The SQL to create the table + RPC is in the README. No anti-cheat —
a client can submit a fake score, same caveat as the self-reported race state.

**Known limitations:**
- If the **host leaves mid-race**, pipe snapshots stop and that round can't
  continue (others return to the room). No host migration.
- Clients self-report position/score (no anti-cheat) — fine for casual play.
- Needs the page served over **http(s)** (Vercel or `npx serve`) so the realtime
  library can load; `file://` is solo-only.
- Best for ~2–6 players. Public free Supabase projects **pause after ~1 week
  idle** — click **Restore** in the dashboard.

---

## 6. Key code map (`index.html`)

Approximate function/area guide (single inline `<script>`):

- **Tunables / constants:** `GRAVITY, FLAP, MAX_FALL, PIPE_W, PIPE_GAP,
  PIPE_SPACING, PIPE_SPEED, GROUND_H, BIRD_R`, `STATE`.
- **Config & state:** `MODES`, `PLAYERS`, `SUPABASE_URL`/`SUPABASE_ANON_KEY`,
  `mp` object, `pipeSeq`.
- **Game logic:** `reset`, `progress`, `diffFor`/`difficulty`, `spawnPipe`,
  `flap`, `gameOver`, `die`, `update` (solo + online branches).
- **Rendering:** `drawWing`, `drawCreature` (used by both `drawBird` and
  `drawGhosts`), `drawPipe`, `drawGround`, backgrounds (`bgMountains`,
  `bgClouds`, `bgOcean`, `skyGradient`, `drawCloud`), `draw`, `drawOnlineHud`,
  `centerText`, `loop`.
- **Networking:** `getSupa`, `sendStateNow/Throttled`, `sendPipesNow/Throttled`,
  `onState`, `onPipes`, `onStart`, `onPresenceSync`, `checkRaceEnd`, `endRace`,
  `beginRace`, `enterRoom`, `leaveRoom`, `randomCode`.
- **UI wiring:** background/player/difficulty pickers, lobby DOM
  (`openLobby/showRoom/renderPlayers/updateDiffLock`), help modal handlers,
  input listeners.

---

## 7. Running & deploying

### Run locally
- **Solo:** open `index.html` in any modern browser.
- **Multiplayer (local test):** serve over http — `npx serve` in the folder —
  then open the printed URL in two windows (`file://` blocks the realtime
  import).

### Deploy (already set up)
Hosted on Vercel as a static site, imported from the GitHub repo. **Any
`git push` to `main` auto-redeploys.** No build command / output dir needed
(framework preset: Other).

### Supabase setup (for multiplayer)
1. Create a free project at https://supabase.com.
2. Project Settings → **API Keys**: copy the **Project URL** and a client key
   (the new **publishable** `sb_publishable_...` key, or the legacy **anon
   public** `eyJ...` key — both work).
3. Paste both into the constants near the top of the `<script>` in `index.html`:
   ```js
   const SUPABASE_URL = "https://<your-project>.supabase.co";
   const SUPABASE_ANON_KEY = "sb_publishable_...";
   ```
   The `SUPA_READY` guard auto-enables multiplayer once the `YOUR_` placeholders
   are replaced. (Current project URL: `https://srbkqecvcjnaboxepldh.supabase.co`.)

---

## 8. Verification approach

There's no automated test suite. Each change was checked by:
- `node --check` on the extracted inline script (syntax).
- A **DOM/canvas-stub smoke test** in Node that runs the script's init plus a few
  `update`/`draw` ticks to catch runtime/reference errors on the **solo** path.
- Manual browser playtesting for visuals/feel; multiplayer requires two
  windows/devices over http(s) and the Supabase keys.

> Note: the live two-device realtime path can't be exercised from the dev
> environment — it's logic-reviewed and needs a real browser test to fully
> confirm.

---

## 9. Change history (chronological)

| Commit | Summary |
|---|---|
| `58e8542` | Initial Flappy Bird web game (canvas, single file) |
| `dba92e8` | Background picker (mountains, clouds, ocean) |
| `ce9fb58` | Progressive difficulty: speed/gap ramp, moving & wide pipes, tighter spacing, level + unlock banners |
| `18a2270` | Player picker: use player photos as the bird with animated wings |
| `11549a1` | Wire up player photos to the picker |
| `e895adf` | Center/zoom photo crop on the face; name player buttons after their image |
| `8b1db5e` | Add `lpaab` as a player |
| `1b136ae` | Easy/Medium/Hard difficulty selector beside the canvas |
| `f506b6a` | Add `jumong` as a player |
| `310ebb7` / `f91bd07` | Update `jumong` photo (tighter face crop) |
| `4771fce` | Add online multiplayer ghost race (Supabase Realtime) |
| `947965c` | Activate multiplayer: add Supabase project URL + publishable key |
| `5e0e4fd` | Add "How to play" help button + instructions modal |
| `82afa15` | Fix multiplayer: host-authoritative pipes, inherit host difficulty, end race only when all are out |
| `f33955d` | Add PROJECT.md (full project documentation) |
| `e34b0ef` | Make layout responsive: scrollable page, fit-to-viewport canvas, stacked controls on small screens |
| `957ec09` | Add social link preview: Open Graph/Twitter meta + generated `og-image.png` banner; update docs |
| `dfbb8fa` | Personalize banner: `mlacu` + `jkdgu` photos and "ROC Network & friends" text |
| `6ae9b14` | Set absolute social-preview URLs to the live Vercel domain; add live-demo link |
| `000b989` | Multiplayer: a dead bird drops and slides off-screen (broadcast `state.x`); lighter bird feel — softer gravity/flap, terminal-velocity cap (`MAX_FALL`), and an auto-flap at race "GO" |
| `2ba14bc` | Retune physics to mirror the original Flappy Bird (gravity 0.29, flap -5.25, terminal 6, tighter nose-dive), scaled from the 30 fps / 288×512 reference to 60 fps / 600px |
| `9b3d3ca` | Per-mode global all-time best scores via Supabase (`best_scores` table + `submit_best` RPC), with a local `flappyBest:<mode>` cache fallback; shows the record holder's name |
| `8ef1782` | In-canvas "🏆 Flappy Best! — ROC Spotlight Award" top-3 podium (per-player rows, per mode); add a main-page "Your name" field so solo scores carry a name |
| `b653923` | Center the canvas with the controls (grid gutters); redesign the bird to a real Flappy look (single wing, belly, beak) incl. photo skins; add a 🌙 night/dark mode (starry scene + dark page theme) |
| `445f523` | Fix photo-bird wing covering the face: draw it behind the photo, offset to peek past the edge |
| `93b9fdd` | Restyle photo skins as a "bat": face medallion with symmetric bat wings (`drawBatWing`); Classic stays a bird |
| `34705ae` | Add synthesized cartoon sound effects (flap whoosh, score blip, falling scream, 3-2-1-GO beeps) with a 🔊 toggle (`flappySound`); Web Audio, no files |
| `222fe9f` | Move the action buttons (Multiplayer/Help/Night/Sound) into a right-side panel flanking the canvas, balancing the Difficulty panel on the left |
| `6959986` | Restyle photo skins as an "angel": replace the bat wings with ethereal soft-glow feathered wings (`drawFeatherWing` — covert + primary feather rows over a luminous bloom that brightens on each flap); also polish the Classic bird (gradient body, rim light, glossy eye, beak seam) |

---

## 10. Ideas / possible next steps

- Host migration so a host leaving doesn't end the round.
- Per-mode best scores; sound effects; a 4th background (night/city).
- Auto-show Help on first visit (remembered via `localStorage`).
- Optional: swap Supabase for a different realtime backend (the `getSupa` +
  `makeAction`/broadcast calls are the only integration points).
