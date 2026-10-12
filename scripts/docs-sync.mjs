#!/usr/bin/env node
// One-way sync of docs/ into an Obsidian vault (see docs/adr/0010-docs-and-vault-sync.md).
// - Reads DOCS_VAULT_PATH from the environment or .env.local; does nothing if unset.
// - Stamps `source: repo` into markdown frontmatter (except templates/).
// - Removes vault files whose source no longer exists, but never touches PROTECTED dirs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
// Compared lowercase: macOS/Windows filesystems are case-insensitive, so docs/notes would land in Notes/.
const PROTECTED = new Set(["notes", ".obsidian", ".trash"]);
const isProtected = (rel) => PROTECTED.has(rel.split(path.sep)[0].toLowerCase());
const UNSTAMPED_DIRS = new Set(["templates"]);

const envFile = path.join(ROOT, ".env.local");
if (!process.env.DOCS_VAULT_PATH && fs.existsSync(envFile)) process.loadEnvFile(envFile);

const vaultPath = process.env.DOCS_VAULT_PATH;
if (!vaultPath) {
  console.log("docs:sync — DOCS_VAULT_PATH not set, skipping.");
  process.exit(0);
}
const VAULT = path.resolve(vaultPath.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
if (VAULT === ROOT || VAULT.startsWith(DOCS + path.sep) || VAULT === DOCS) {
  console.error("docs:sync — DOCS_VAULT_PATH must be outside the repo docs folder.");
  process.exit(1);
}
fs.mkdirSync(VAULT, { recursive: true });

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, base);
    return entry.isFile() ? [path.relative(base, full)] : [];
  });
}

function stamp(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return `---\nsource: repo\n---\n\n${markdown}`;
  const body = match[1].replace(/^source:.*\n?/m, "").trimEnd();
  return `---\n${body}\nsource: repo\n---\n${markdown.slice(match[0].length)}`;
}

const sourceFiles = walk(DOCS);
const expected = new Set(sourceFiles);
let written = 0;

for (const rel of sourceFiles) {
  const src = path.join(DOCS, rel);
  const dest = path.join(VAULT, rel);
  const topDir = rel.split(path.sep)[0];
  if (isProtected(rel)) {
    console.warn(`docs:sync — skipping ${rel} (protected vault folder)`);
    continue;
  }
  const shouldStamp = rel.endsWith(".md") && !UNSTAMPED_DIRS.has(topDir);
  const content = shouldStamp ? stamp(fs.readFileSync(src, "utf8")) : fs.readFileSync(src);
  if (fs.existsSync(dest) && Buffer.compare(fs.readFileSync(dest), Buffer.from(content)) === 0)
    continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  written++;
}

let removed = 0;
for (const rel of walk(VAULT)) {
  if (isProtected(rel) || expected.has(rel)) continue;
  fs.rmSync(path.join(VAULT, rel));
  removed++;
}
// Prune empty directories left behind (outside protected folders).
function pruneEmpty(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || (dir === VAULT && PROTECTED.has(entry.name.toLowerCase())))
      continue;
    const full = path.join(dir, entry.name);
    pruneEmpty(full);
    if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
  }
}
pruneEmpty(VAULT);

console.log(`docs:sync — ${written} written, ${removed} removed → ${VAULT}`);
