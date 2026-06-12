# Landmark Transformation — Generation Prompts

Concept 001: **La Sagrada Família** (Barcelona). Blueprint line-art → completed, imaginative, dark finished design.

> **Golden rule for a clean transition:** the START and END images must share the *exact* same composition — identical camera position (dead-on, eye-level, orthographic elevation), identical subject scale and centering, identical 1:1 square frame, and identical pure-black background. Only the *rendering* changes (line-art → finished stone). If the geometry shifts, the morph will smear. Generate the END image first, then ask the tool to redraw that *same* image as a blueprint for the START — or use the same seed.

---

## 1. START image — blueprint line-art

```text
A precise architectural elevation drawing of La Sagrada Família basilica, rendered as
fine white vector line-art on a pure black background. Head-on, perfectly symmetrical
front elevation — no perspective, orthographic and flat like a technical CAD drawing.
The full facade and all spires are visible and centred, occupying the middle 80% of a
square frame. Crisp 1px hairline strokes describe every tower, pinnacle, arched portal,
rose window and tracery detail. Faint thin dimension lines, tick marks and small
annotation labels sit around the edges like a draughtsman's blueprint. Glowing white
lines against deep black, subtle bloom on the linework. Monochrome, elegant, editorial,
ultra-detailed, minimal. No colour, no fill, no shading, no sky, no ground texture.

Square 1:1, centred composition, pure #000000 background.
```

---

## 2. END image — completed, imaginative, dark finished design

```text
The same La Sagrada Família basilica from the exact same dead-on symmetrical front
elevation, same scale and centring in a square frame — now a fully realised, completed
building. Imaginative finished design: pale carved Barcelona stone, every spire topped
and crowned, the central tower of Jesus rising highest with a luminous cross. Dramatic
dark cinematic lighting — warm light grazing the stone from below so the facade glows
against an inky black void, deep shadows in the recesses. Photoreal sculptural detail,
intricate Gothic and organic Gaudí ornament, rose windows faintly lit from within.
Moody, premium, reverent, high contrast. Faint ghost of the original dimension lines
and annotation labels still visible at the edges, tying it back to the blueprint.

Square 1:1, centred composition, pure black background, no sky, no surroundings,
no people, no text watermark.
```

---

## 3. TRANSITION video — image-to-video (start frame → end frame)

Upload **START** as the first frame and **END** as the last frame. ~5 seconds.

```text
A single locked, static shot. The camera does not move at all — no pan, no zoom,
no tilt, no parallax, no shake. The framing stays perfectly fixed.

Over five seconds, the white blueprint line-art of La Sagrada Família transforms in
place into the fully finished stone basilica. The glowing lines thicken into volume,
mass fills in between them, and the structure resolves from a luminous drawing into
solid, warmly lit carved stone — a smooth, continuous morph from bottom to top, as if
the building is materialising along its own outlines. Calm, cinematic, deliberate
pacing. The pure black background never changes.

Only the transformation happens. No camera motion, no added particles, no light rays,
no lens flares, no text, no flickering, no extra effects.
```

**Negative prompt (video):** `camera movement, pan, zoom, dolly, tilt, parallax, handheld shake, people, birds, clouds, sky, audio, music, text, captions, watermark, particles, sparks, smoke, lens flare, light streaks, flashing, color shift on the background, distortion, warping geometry`

---

## Settings cheat-sheet
- **Aspect:** 1:1 (square) — matches the existing `sagrada/` frame pipeline (960×960).
- **Duration:** ~5s. Extract with `ffmpeg -i transition.mp4 -vsync 0 -c:v libwebp -quality 80 frames/frame_%04d.webp` (≈120 frames at 24fps).
- **Consistency trick:** reuse the same seed for START and END, or generate END then run an image-to-image "convert to white blueprint line drawing on black" pass to produce START.

---

## Reusable template (swap the landmark for concept 002+)

Replace `{LANDMARK}` and `{MATERIAL/STYLE}`; keep everything else identical so all
landmarks share one cohesive look.

- **Start:** `A precise architectural elevation drawing of {LANDMARK}, fine white vector line-art on a pure black background, dead-on symmetrical orthographic front elevation, centred in a square frame, faint dimension lines and annotation labels, glowing hairline strokes, monochrome, ultra-detailed, minimal. No colour, no fill, no shading.`
- **End:** `The same {LANDMARK} from the exact same dead-on elevation, scale and centring — fully completed in {MATERIAL/STYLE}, dramatic dark cinematic lighting glowing against an inky black void, photoreal sculptural detail, moody and premium, faint ghost of the dimension lines at the edges. Square 1:1, pure black background, no surroundings, no people, no text.`
- **Video:** `Locked static shot, no camera movement. Over 5 seconds the white line-art of {LANDMARK} morphs in place into the finished {MATERIAL/STYLE} build — lines thicken into mass, resolving from drawing to solid form, bottom to top. Calm, cinematic, continuous. Black background unchanged. Only the transformation; no camera motion, particles, effects, text, or audio.`
