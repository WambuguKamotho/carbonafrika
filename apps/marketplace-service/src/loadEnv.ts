import path from "path";
import dotenv from "dotenv";

// Load env BEFORE any other module imports. This file is imported as a
// side effect from index.ts so its body executes before sibling imports
// evaluate module-level `process.env.*` reads.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();
