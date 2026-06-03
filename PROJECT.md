# Flappy Bird — Project Documentation

A complete record of this project: what it is, how it's built, every feature, the
architecture, how to run/deploy it, and the full history of changes.

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
| Persistence | `localStorage` | Best score, chosen background/player/difficulty/name |

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
- Bird physics: gravity (`GRAVITY`), upward impulse on flap (`FLAP`), rotation
  follows velocity.
- Pipes scroll right→left; pass through the gap to score. Hitting a pipe, the
  ground, or (clamped) the ceiling ends the run.
- **Best score** saved in `localStorage` (`flappyBest`).
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

### 4.4 Backgrounds
Picker for **mountains / clouds / ocean**, each drawn with canvas primitives
(layered mountains + snow caps + sun; fluffy clouds; animated ocean waves).
Saved as `flappyBg`.

### 4.5 Players (photo birds + wings)
- Driven by the `PLAYERS` array: `{ name, file }` entries. `"Classic"`
  (`file: null`) is the drawn yellow bird and the default/fallback.
- Photos are **circle-cropped** with a focal zoom (`drawCreature` → `cover`
  scale × `zoom`, anchored at `focusX`/`focusY`, default ~face-centered).
  Per-player `zoom`/`focusX`/`focusY` overrides are supported.
- Two **animated wings** flap up on each tap and settle (`bird.wing` decays).
- Graceful fallback: a missing/broken image silently reverts to the Classic
  bird (`p.ok` tracks load success). Saved as `flappyPlayer`.
- **To add a player:** drop an image in `players/` and add a line to `PLAYERS`
  (see `players/README.md`).

### 4.6 Help / How to play
A **❓ How to play** button opens a modal explaining single-player and the full
multiplayer flow, with tips. Closes via ✕, "Got it!", or backdrop click.

### 4.7 Responsive layout
The page scales to any resolution and **scrolls instead of clipping** when the
content is taller than the viewport (previously `overflow:hidden` cut things off
and zoom was disabled). The canvas sizes itself with
`width: min(400px, 92vw, 52dvh)` + `aspect-ratio: 2/3` (fits both width and
height, never stretched). On small screens (`@media max-width:560px`) the side
Difficulty panel stacks into a row above the canvas, and modals scroll
internally. Pinch-zoom is re-enabled.

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

> **Important for previews to show the image:** Facebook/Messenger want an
> **absolute** `og:image` URL. Set `og:image`/`twitter:image` to
> `https://<your-vercel-domain>/og-image.png` once the live domain is known, and
> re-scrape with the Facebook Sharing Debugger.

### 4.9 Online multiplayer ("ghost race")
- **🌐 Multiplayer** button → lobby modal: enter a name, **Create room** (gets a
  short code) or **Join** with a code. Player list + host's difficulty shown.
- The **host** picks difficulty and clicks **Start race**; a 3-2-1 countdown
  syncs everyone.
- Everyone flies the **same pipes** and sees the others as semi-transparent
  **ghost birds** with name tags; a live **scoreboard** (top-right) shows scores.
- **Win rule:** keep flying after others crash — the race runs until **everyone
  is out**, and the **highest score wins**. A dead player keeps spectating live.
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
- `state { id, name, playerName, y, rot, wing, alive, score }` — each → all
  (~12 Hz): a player's bird, for rendering ghosts + the scoreboard.
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

- **Tunables / constants:** `GRAVITY, FLAP, PIPE_W, PIPE_GAP, PIPE_SPACING,
  PIPE_SPEED, GROUND_H, BIRD_R`, `STATE`.
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
| _next_ | Add social link preview (Open Graph/Twitter meta + generated `og-image.png` banner); document changes |

---

## 10. Ideas / possible next steps

- Host migration so a host leaving doesn't end the round.
- Per-mode best scores; sound effects; a 4th background (night/city).
- Auto-show Help on first visit (remembered via `localStorage`).
- Optional: swap Supabase for a different realtime backend (the `getSupa` +
  `makeAction`/broadcast calls are the only integration points).
