// pdf-parse's package-root index.js runs a debug self-test at import time
// under bundlers (see fileText.ts) — we import the inner module directly,
// which @types/pdf-parse doesn't declare a subpath for. Mirrors the shape
// of @types/pdf-parse's root declaration.
declare module "pdf-parse/lib/pdf-parse.js" {
  import PdfParse = require("pdf-parse");
  export = PdfParse;
}
