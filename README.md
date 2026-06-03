# Flappy Bird

A tiny web Flappy Bird clone — a single static `index.html` using `<canvas>` and
vanilla JavaScript. No dependencies, no build step.

## Play

- **Flap:** click, tap, or press `Space` / `↑`
- Pass between the pipes to score. Hitting a pipe or the ground ends the game.
- Your best score is saved in the browser (`localStorage`).
- The game gets harder as you score: faster pipes, narrowing gaps, tighter
  spacing, plus **moving pipes** (score ≥ 8) and **wide pipes** (score ≥ 14).
- Pick a **Background** (mountains / clouds / ocean) and a **Player** under the
  canvas; both choices are remembered.

## Choose your player

Use one of your own photos as the bird. See [`players/README.md`](players/README.md):
drop an image in `players/` and add a line to the `PLAYERS` array in
`index.html`. The photo is circle-cropped and the game adds flapping wings.

## Run locally

Just open `index.html` in any modern browser. (Or serve the folder with any
static server, e.g. `npx serve`.)

## Deploy

Hosted on Vercel as a static site. Any push to `main` auto-redeploys.

**Live demo:** _add your Vercel URL here after the first deploy_
