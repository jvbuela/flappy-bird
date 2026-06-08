# Backgrounds

Photo backgrounds for the game. Drop an image here and it's cover-fit
(center-cropped) to fill the 400×600 game canvas.

## How to add a photo background

1. **Add an image** here, e.g. `backgrounds/office.png`.
   - Any size/orientation works (landscape is fine — it's center-cropped to the
     portrait canvas). Keep it web-sized (≤ ~500 KB) so it loads fast.
   - PNG or JPG.
2. **Register it** in the `<script>` near the top of `../index.html`:

   ```js
   const BACKGROUNDS = ["mountains", "clouds", "ocean", "office"];   // add the name
   const BG_PHOTOS = { office: "backgrounds/office.png" };           // name -> file
   ```

3. **Add a picker button** in the `#bgPicker` block of `../index.html`:

   ```html
   <button data-bg="office">🏢 Office</button>
   ```

4. Reload the game and pick it from the **Background** row beside the canvas.

Notes:
- If the image is missing or fails to load, the game falls back to the drawn
  mountains scene — it never breaks.
- In **NS shift** (night mode), photo backgrounds stay visible but are dimmed with
  a dark overlay (the scene "at night"), instead of the starry night scene used by
  the drawn backgrounds.

The currently-wired entry is **`office.png`** — just drop your office photo here
with that exact name and reload.
