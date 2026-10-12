// Generates the bundled demo GIFs (public/gifs/*.gif) and their manifest in @repo/rich-text.
// Original artwork: vector shapes and short phrases drawn on a canvas in headless Chromium,
// encoded with gifenc. No emoji glyphs or third-party images, so there are no licensing questions.
//
//   pnpm --filter @repo/web gifs:generate
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import gifenc from "gifenc";
import { chromium } from "playwright";

// gifenc ships CommonJS, so its named exports come from the default import.
const { applyPalette, GIFEncoder, quantize } = gifenc;

const WIDTH = 240;
const HEIGHT = 180;
const FRAMES = 18;
const DELAY_MS = 70;

const OUT_DIR = fileURLToPath(new URL("../public/gifs/", import.meta.url));
const MANIFEST = fileURLToPath(
  new URL("../../../packages/rich-text/src/bundled-gifs.ts", import.meta.url),
);

/** slug, phrase, alt text, search tags, scene, background gradient [from, to]. */
const GIFS = [
  [
    "thank-you",
    "Thank you!",
    "“Thank you!” with falling confetti",
    "thanks thank you grateful confetti",
    "confetti",
    ["#6440f0", "#9a7dff"],
  ],
  [
    "kudos",
    "Kudos!",
    "“Kudos!” with bursting stars",
    "kudos stars celebrate",
    "stars",
    ["#1d1250", "#5230d0"],
  ],
  [
    "you-rock",
    "You rock!",
    "“You rock!” with bouncing hearts",
    "you rock awesome love hearts",
    "hearts",
    ["#b91c1c", "#f472b6"],
  ],
  [
    "nailed-it",
    "Nailed it!",
    "“Nailed it!” with a pulsing ring",
    "nailed it success win",
    "ring",
    ["#166534", "#22c55e"],
  ],
  [
    "teamwork",
    "Teamwork!",
    "“Teamwork!” with orbiting dots",
    "teamwork together team collaboration",
    "orbit",
    ["#0f3d22", "#15803d"],
  ],
  [
    "great-idea",
    "Great idea!",
    "“Great idea!” with glowing rays",
    "great idea smart brilliant",
    "rays",
    ["#854d0e", "#f59e0b"],
  ],
  [
    "mvp",
    "MVP",
    "“MVP” with a shining crown of stars",
    "mvp best star winner",
    "stars",
    ["#2f1d78", "#d97706"],
  ],
  [
    "high-five",
    "High five!",
    "“High five!” with radiating bars",
    "high five yay",
    "bars",
    ["#5230d0", "#ec4899"],
  ],
  [
    "on-fire",
    "On fire!",
    "“On fire!” with rising embers",
    "on fire hot streak",
    "embers",
    ["#7c2d12", "#f97316"],
  ],
  [
    "legend",
    "Legend",
    "“Legend” with twinkling sparkles",
    "legend hero amazing sparkles",
    "sparkles",
    ["#0f1013", "#3f4552"],
  ],
  [
    "shipped",
    "Shipped!",
    "“Shipped!” with a launching streak",
    "shipped launch release rocket",
    "launch",
    ["#1e3a8a", "#6440f0"],
  ],
  [
    "hundred",
    "100%",
    "“100%” with a shaking burst",
    "100 percent perfect hundred",
    "burst",
    ["#991b1b", "#dc2626"],
  ],
  [
    "congrats",
    "Congrats!",
    "“Congrats!” with floating balloons",
    "congrats congratulations party balloons",
    "balloons",
    ["#5230d0", "#06b6d4"],
  ],
  [
    "well-done",
    "Well done!",
    "“Well done!” with a checkmark drawing in",
    "well done good job check",
    "check",
    ["#14532d", "#16a34a"],
  ],
  [
    "superstar",
    "Superstar",
    "“Superstar” with a spinning star",
    "superstar star amazing",
    "spin",
    ["#4126a6", "#f59e0b"],
  ],
  [
    "lifesaver",
    "Lifesaver!",
    "“Lifesaver!” with expanding ripples",
    "lifesaver saved thanks help",
    "ripples",
    ["#0e7490", "#22d3ee"],
  ],
  [
    "above-beyond",
    "Above & beyond",
    "“Above & beyond” with rising arrows",
    "above beyond extra mile",
    "arrows",
    ["#3b0764", "#a855f7"],
  ],
  [
    "woohoo",
    "Woohoo!",
    "“Woohoo!” with confetti bursting upward",
    "woohoo yay celebrate party",
    "confetti-up",
    ["#be185d", "#f59e0b"],
  ],
  [
    "grateful",
    "So grateful",
    "“So grateful” with drifting hearts",
    "grateful thanks appreciate hearts",
    "drift",
    ["#9d174d", "#fb7185"],
  ],
  [
    "boom",
    "Boom!",
    "“Boom!” with an exploding burst",
    "boom wow impact",
    "burst",
    ["#312e81", "#e11d48"],
  ],
];

/** Runs in the browser: draws every frame of one GIF and returns RGBA pixels (base64) per frame. */
function renderFrames({ width, height, frames, phrase, scene, colors }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  // Deterministic pseudo-random, so regenerating produces identical files.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const particles = Array.from({ length: 28 }, () => ({
    x: rand(),
    y: rand(),
    s: rand(),
    h: rand(),
    r: rand(),
  }));
  const palette = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#ffffff"];

  const star = (x, y, r, rot, color, points = 5) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = rot + (i * Math.PI) / points - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const heart = (x, y, s, color) => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const sparkle = (x, y, r, color) => star(x, y, r, 0, color, 4);

  const scenes = {
    confetti: (t) =>
      particles.forEach((p, i) => {
        const y = ((p.y + t) % 1) * (height + 20) - 10;
        ctx.save();
        ctx.translate(p.x * width, y);
        ctx.rotate((t + p.r) * TAU * (i % 2 ? 1 : -1));
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }),
    "confetti-up": (t) =>
      particles.forEach((p, i) => {
        const k = (t + p.s) % 1;
        const a = -Math.PI / 2 + (p.x - 0.5) * 1.6;
        const d = k * 120;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(width / 2 + Math.cos(a) * d - 3, height * 0.85 + Math.sin(a) * d - 3, 6, 6);
        ctx.globalAlpha = 1;
      }),
    stars: (t) =>
      particles.slice(0, 10).forEach((p, i) => {
        const k = (t + p.s) % 1;
        star(
          p.x * width,
          p.y * height,
          4 + 8 * Math.sin(k * Math.PI),
          k * TAU,
          palette[i % 3 === 0 ? 0 : 5],
        );
      }),
    hearts: (t) =>
      particles.slice(0, 8).forEach((p, i) => {
        const bounce = Math.abs(Math.sin((t + p.s) * TAU)) * 18;
        heart(p.x * width, height - 34 - bounce, 16 + 8 * p.r, i % 2 ? "#fecdd3" : "#ffffff");
      }),
    drift: (t) =>
      particles.slice(0, 10).forEach((p) => {
        const y = height - ((t + p.s) % 1) * (height + 30);
        ctx.globalAlpha = 0.85;
        heart(p.x * width + Math.sin((t + p.r) * TAU) * 10, y, 12 + 10 * p.r, "#ffe4e6");
        ctx.globalAlpha = 1;
      }),
    ring: (t) => {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 3; i++) {
        const k = (t + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 20 + k * 100, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    ripples: (t) => scenes.ring(t),
    orbit: (t) => {
      for (let i = 0; i < 6; i++) {
        const a = t * TAU + (i * TAU) / 6;
        ctx.fillStyle = palette[i];
        ctx.beginPath();
        ctx.arc(width / 2 + Math.cos(a) * 95, height / 2 + Math.sin(a) * 62, 8, 0, TAU);
        ctx.fill();
      }
    },
    rays: (t) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(t * (TAU / 6));
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(160, -14);
        ctx.lineTo(160, 14);
        ctx.fill();
      }
      ctx.restore();
    },
    bars: (t) => {
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16;
        const len = 30 + 30 * Math.abs(Math.sin(t * TAU + i));
        ctx.strokeStyle = palette[i % palette.length];
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(width / 2 + Math.cos(a) * 70, height / 2 + Math.sin(a) * 55);
        ctx.lineTo(width / 2 + Math.cos(a) * (70 + len), height / 2 + Math.sin(a) * (55 + len));
        ctx.stroke();
      }
    },
    embers: (t) =>
      particles.forEach((p, i) => {
        const k = (t + p.s) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = i % 2 ? "#fde047" : "#fdba74";
        ctx.beginPath();
        ctx.arc(p.x * width + Math.sin(k * TAU) * 6, height - k * height, 2 + 3 * p.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }),
    sparkles: (t) =>
      particles.slice(0, 14).forEach((p) => {
        const k = Math.sin(((t + p.s) % 1) * Math.PI);
        sparkle(p.x * width, p.y * height, 2 + 9 * k, "#fef9c3");
      }),
    launch: (t) => {
      for (let i = 0; i < 8; i++) {
        const k = (t + i / 8) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.9})`;
        ctx.lineWidth = 3;
        const x = -40 + k * (width + 80);
        const y = height - 20 - k * (height - 20) + i * 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 40, y + 30);
        ctx.stroke();
      }
    },
    burst: (t) => {
      const k = (t * 2) % 1;
      for (let i = 0; i < 20; i++) {
        const a = (i * TAU) / 20;
        ctx.fillStyle = palette[i % palette.length];
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(width / 2 + Math.cos(a) * k * 120, height / 2 + Math.sin(a) * k * 90, 5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    balloons: (t) =>
      particles.slice(0, 6).forEach((p, i) => {
        const y = height + 30 - ((t + p.s) % 1) * (height + 80);
        const x = p.x * width + Math.sin((t + p.r) * TAU) * 8;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 18);
        ctx.lineTo(x, y + 40);
        ctx.stroke();
        ctx.fillStyle = palette[i % 5];
        ctx.beginPath();
        ctx.ellipse(x, y, 13, 17, 0, 0, TAU);
        ctx.fill();
      }),
    check: (t) => {
      const k = Math.min(1, t * 1.6);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      const pts = [
        [70, 92],
        [105, 125],
        [175, 55],
      ];
      ctx.moveTo(...pts[0]);
      if (k < 0.4)
        ctx.lineTo(
          pts[0][0] + (pts[1][0] - pts[0][0]) * (k / 0.4),
          pts[0][1] + (pts[1][1] - pts[0][1]) * (k / 0.4),
        );
      else {
        ctx.lineTo(...pts[1]);
        const m = (k - 0.4) / 0.6;
        ctx.lineTo(
          pts[1][0] + (pts[2][0] - pts[1][0]) * m,
          pts[1][1] + (pts[2][1] - pts[1][1]) * m,
        );
      }
      ctx.stroke();
    },
    spin: (t) => star(width / 2, height / 2, 70, t * (TAU / 5), "rgba(253,224,71,0.35)"),
    arrows: (t) => {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      for (let i = 0; i < 5; i++) {
        const y = height - ((t + i / 5) % 1) * (height + 40) + 20;
        const x = 30 + i * 45;
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x + 14, y);
        ctx.lineTo(x - 14, y);
        ctx.fill();
        ctx.fillRect(x - 5, y, 10, 16);
      }
    },
  };

  const out = [];
  for (let f = 0; f < frames; f++) {
    const t = f / frames;
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    scenes[scene](t);
    // The phrase, gently pulsing.
    const scale = 1 + 0.06 * Math.sin(t * Math.PI * 2);
    const size = phrase.length > 12 ? 26 : phrase.length > 8 ? 32 : 40;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(15,16,19,0.55)";
    ctx.strokeText(phrase, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(phrase, 0, 0);
    ctx.restore();
    const data = ctx.getImageData(0, 0, width, height).data;
    let binary = "";
    for (let i = 0; i < data.length; i += 0x8000)
      binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
    out.push(btoa(binary));
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const manifest = [];
for (const [slug, phrase, alt, tags, scene, colors] of GIFS) {
  const frames = await page.evaluate(renderFrames, {
    width: WIDTH,
    height: HEIGHT,
    frames: FRAMES,
    phrase,
    scene,
    colors,
  });
  // One palette per GIF (from a sample of frames): smaller files and no color flicker between frames.
  const rgbaFrames = frames.map((frame) => new Uint8Array(Buffer.from(frame, "base64")));
  const sample = new Uint8Array(rgbaFrames.filter((_, i) => i % 3 === 0).flatMap((f) => [...f]));
  const palette = quantize(sample, 128);
  const gif = GIFEncoder();
  rgbaFrames.forEach((rgba, i) => {
    gif.writeFrame(
      applyPalette(rgba, palette),
      WIDTH,
      HEIGHT,
      i === 0 ? { palette, delay: DELAY_MS, repeat: 0 } : { delay: DELAY_MS },
    );
  });
  gif.finish();
  writeFileSync(`${OUT_DIR}${slug}.gif`, gif.bytes());
  manifest.push({
    id: slug,
    src: `/gifs/${slug}.gif`,
    alt,
    width: WIDTH,
    height: HEIGHT,
    tags: tags.split(" "),
  });
  console.log(`  ${slug}.gif`);
}
await browser.close();

writeFileSync(
  MANIFEST,
  `// GENERATED by \`pnpm --filter @repo/web gifs:generate\` — do not edit.
// Original demo GIFs served by the web app from /gifs/ (see apps/web/scripts/generate-demo-gifs.mjs).

export type BundledGif = { id: string; src: string; alt: string; width: number; height: number; tags: string[] };

export const BUNDLED_GIFS: BundledGif[] = ${JSON.stringify(manifest, null, 2)};
`,
);
console.log(`Wrote ${manifest.length} GIFs and ${MANIFEST}`);
