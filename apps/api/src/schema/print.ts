import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { printedSchema } from "./index";

const target = fileURLToPath(new URL("../../schema.graphql", import.meta.url));
writeFileSync(target, printedSchema());
console.log(`Wrote ${target}`);
