import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderTokensCss } from "../src/tokens/render-css";

const target = fileURLToPath(new URL("../src/tokens/tokens.css", import.meta.url));
writeFileSync(target, renderTokensCss());
console.log(`Wrote ${target}`);
