# Players

Drop player photos in this folder to use them as the bird.

## How to add a player

1. **Add an image** here, e.g. `players/alice.png`.
   - Square-ish images look best (they're cropped to a circle).
   - ~200×200px or larger, PNG or JPG.
2. **List it** in the `PLAYERS` array near the top of the `<script>` in
   `../index.html`:

   ```js
   const PLAYERS = [
     { name: "Classic", file: null },            // drawn bird, always available
     { name: "Alice",   file: "players/alice.png" },
     { name: "Bob",     file: "players/bob.png" },
   ];
   ```

3. Reload the game and pick the player from the **Player** row under the canvas.

Notes:
- `"Classic"` (`file: null`) is the default drawn bird and always works.
- If an image is missing or fails to load, that player falls back to the classic
  bird — the game never breaks.
- Wings are drawn by the game and flap automatically; the photo just becomes the
  body.
