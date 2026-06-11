#!/usr/bin/env node
/**
 * Generate the Tester Tech image set via Kie.ai (Nano Banana).
 *
 * Brand-matched prompts: dark, premium, champagne-gold accents, Grade-5
 * titanium, cinematic studio product photography — matching TesterTech.html.
 *
 * Run from the project root:
 *   node scripts/generate-assets.mjs                 # fast model, 2K
 *   node scripts/generate-assets.mjs --model pro     # highest quality
 *   node scripts/generate-assets.mjs --only smart-glasses,smart-assistant
 *
 * Requires KIE_API_KEY in the environment or in .env.
 */
import process from "node:process";
import { parseArgs, loadKey, generate } from "./kie-image.mjs";

// Shared style suffixes keep the six images visually cohesive.
const STYLE =
  "Cinematic studio product photography, deep near-black charcoal seamless background, " +
  "dramatic warm champagne-gold rim lighting, soft reflections, shallow depth of field, " +
  "ultra-detailed, photorealistic, premium luxury tech brand aesthetic, no text, no logos, no watermark.";

const BG_STYLE =
  "Abstract futuristic technology background, deep near-black charcoal base with glowing " +
  "champagne-gold and warm amber light, fine circuit-like geometry, soft volumetric depth and " +
  "bokeh, elegant and minimal, lots of negative space, cinematic, photorealistic, no text, no logos, no people.";

const ASSETS = [
  {
    name: "tech-bg-hero",
    output: "assets/tech-bg-hero.jpg",
    aspect: "16:9",
    prompt:
      "A wide atmospheric hero background for a premium consumer-tech brand: out-of-focus floating " +
      "device silhouettes and flowing light ribbons receding into darkness. " + BG_STYLE,
  },
  {
    name: "hero-watch",
    output: "assets/hero-watch.jpg",
    aspect: "4:5",
    prompt:
      "A flagship smartwatch named Chrono Pro: brushed Grade-5 titanium case, sapphire crystal, " +
      "circular always-on AMOLED display glowing softly, premium woven band, floating on a dark " +
      "pedestal, three-quarter angle. " + STYLE,
  },
  {
    name: "smart-glasses",
    output: "assets/smart-glasses.jpg",
    aspect: "4:3",
    prompt:
      "Sleek minimalist smart glasses named Spectra: ultra-thin matte titanium frame, subtle embedded " +
      "waveguide display catching a faint gold glow, tiny side camera, resting at a three-quarter angle. " + STYLE,
  },
  {
    name: "smart-assistant",
    output: "assets/smart-assistant.jpg",
    aspect: "4:3",
    prompt:
      "A cylindrical smart home voice assistant speaker named Aria: fabric mesh body in warm charcoal, a " +
      "thin glowing champagne-gold light ring near the top, minimalist Scandinavian industrial design, on a " +
      "dark surface. " + STYLE,
  },
  {
    name: "tech-bg-band",
    output: "assets/tech-bg-band.jpg",
    aspect: "21:9",
    prompt:
      "An ultra-wide banner background of sweeping golden light streaks over a dark gradient, suggesting " +
      "speed and connectivity. " + BG_STYLE,
  },
  {
    name: "tech-bg-soft",
    output: "assets/tech-bg-soft.jpg",
    aspect: "16:9",
    prompt:
      "A calm, soft-focus futuristic background: gentle gold particle field and faint grid fading into deep " +
      "charcoal, very subtle. " + BG_STYLE,
  },
];

async function run() {
  const a = parseArgs(process.argv.slice(2));
  const model = a.model || "2";
  const resolution = a.resolution || "2K";
  const only = a.only ? new Set(a.only.split(",").map((s) => s.trim())) : null;

  const key = await loadKey();
  if (!key) {
    console.error("ERROR: KIE_API_KEY not found in environment or .env file.");
    console.error("Copy .env.example to .env and add your key (get one at https://kie.ai).");
    process.exit(2);
  }

  const queue = only ? ASSETS.filter((x) => only.has(x.name)) : ASSETS;
  const results = [];
  for (const asset of queue) {
    console.log(`\n=== ${asset.output} (${asset.aspect}) ===`);
    try {
      const final = await generate({
        key,
        model,
        prompt: asset.prompt,
        output: asset.output,
        aspect: asset.aspect,
        resolution,
      });
      console.log(`Image saved to: ${final}`);
      results.push([asset.output, true]);
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      results.push([asset.output, false]);
    }
  }

  console.log("\n================ SUMMARY ================");
  const ok = results.filter(([, good]) => good).length;
  for (const [pathStr, good] of results) console.log(`  ${good ? "OK  " : "FAIL"}  ${pathStr}`);
  console.log(`  ${ok}/${results.length} generated.`);
  if (ok !== results.length) process.exit(1);
}

run();
