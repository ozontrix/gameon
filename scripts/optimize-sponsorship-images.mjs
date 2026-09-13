/**
 * Optimise the sponsorship deck images in place.
 *
 * The exported slides are 6000×3375 / ~4–8 MB each (~72 MB in total). They are
 * only ever displayed at up to ~1080 px wide (2× retina = 2160 px) inside the
 * sponsorship cards, or a little wider in the full-screen viewer, so resizing
 * them to 2400 px wide keeps them sharp while cutting the payload ~6×.
 *
 * Usage:
 *   node scripts/optimize-sponsorship-images.mjs                 # all slides
 *   node scripts/optimize-sponsorship-images.mjs --probe 0001    # size test
 *   node scripts/optimize-sponsorship-images.mjs --from 1 --to 6 # a range
 *   node scripts/optimize-sponsorship-images.mjs --quality 80 --width 2200
 *   node scripts/optimize-sponsorship-images.mjs --force         # re-encode
 *
 * Files already at (or below) the target width are skipped unless --force is
 * passed, so running it again after adding new slides only touches the new ones.
 *
 * Applied to the launch deck: 6000×3375 → 2400×1350 @ q86, i.e. ~69 MB → 3.8 MB.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULTS = { width: 2400, quality: 86 };

const dir = path.join(process.cwd(), "public", "sponsorship");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const targetWidth = argValue("--width", DEFAULTS.width);
const quality = argValue("--quality", DEFAULTS.quality);
const from = argValue("--from", 1);
const to = argValue("--to", Number.MAX_SAFE_INTEGER);
const force = process.argv.includes("--force");
const probeIndex = process.argv.indexOf("--probe");
const probePage = probeIndex === -1 ? null : process.argv[probeIndex + 1];

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function encode(input, output, width, q) {
  await sharp(input)
    .resize({ width, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: q, mozjpeg: true, progressive: true, chromaSubsampling: "4:2:0" })
    .toFile(output);
}

async function replace(tmp, target) {
  try {
    await fs.rename(tmp, target);
  } catch {
    // Windows occasionally refuses a rename over an existing file — fall back
    await fs.rm(target, { force: true });
    await fs.rename(tmp, target);
  }
}

async function listSlides() {
  const entries = await fs.readdir(dir);
  return entries.filter((file) => file.toLowerCase().endsWith(".jpg")).sort();
}

async function probe(page) {
  const file = (await listSlides()).find((name) => name.includes(`_page-${page}`));
  if (!file) {
    console.error(`No slide matching _page-${page} in ${dir}`);
    process.exitCode = 1;
    return;
  }

  const input = path.join(dir, file);
  const { width, height } = await sharp(input).metadata();
  console.log(`${file}\noriginal: ${width}×${height} — ${kb((await fs.stat(input)).size)}`);
  console.log(`\nresized to ${targetWidth}px wide:`);

  for (const q of [72, 76, 80, 82, 86]) {
    const out = path.join(dir, `.probe-q${q}.jpg`);
    await encode(input, out, targetWidth, q);
    const size = (await fs.stat(out)).size;
    console.log(
      `  quality ${q}: ${kb(size)}  → 16 slides ≈ ${mb(size * 16)}`
    );
    await fs.rm(out, { force: true });
  }
}

async function run() {
  const slides = await listSlides();
  const selected = slides.slice(from - 1, to);

  if (selected.length === 0) {
    console.log("No slides matched the given range.");
    return;
  }

  console.log(
    `Optimising ${selected.length} of ${slides.length} slide(s) → ${targetWidth}px wide, quality ${quality}`
  );

  let before = 0;
  let after = 0;
  let processed = 0;

  for (const file of selected) {
    const target = path.join(dir, file);
    const originalSize = (await fs.stat(target)).size;
    const { width, height } = await sharp(target).metadata();
    before += originalSize;

    if (!force && width <= targetWidth) {
      after += originalSize;
      console.log(`  skip   ${file} — already ${width}px (${kb(originalSize)})`);
      continue;
    }

    const tmp = `${target}.tmp`;
    await encode(target, tmp, targetWidth, quality);
    const newSize = (await fs.stat(tmp)).size;
    await replace(tmp, target);

    after += newSize;
    processed += 1;
    console.log(
      `  resize ${file} — ${width}×${height} ${kb(originalSize)} → ${kb(newSize)} (${Math.round(
        (1 - newSize / originalSize) * 100
      )}% smaller)`
    );
  }

  console.log(
    `\nDone. Processed ${processed} file(s). Total ${kb(before)} → ${kb(after)} (${mb(after)})`
  );
}

if (probePage) {
  await probe(probePage);
} else {
  await run();
}
