// Applies pending migrations. Also runs automatically when the app opens the
// database (lib/db/index.ts), so this script is for CI / explicit use.
import { db } from "../lib/db";

// Importing lib/db runs migrations as a side effect of connection setup.
void db;
console.log("Migrations applied. Database ready.");
