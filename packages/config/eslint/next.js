import nextVitals from "eslint-config-next/core-web-vitals";
import base from "./base.js";

/** Next.js apps (apps/web). Base comes last so typescript-eslint's parser wins over Next's. */
export default [...nextVitals, ...base];
