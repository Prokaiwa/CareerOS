// pdf-parse's package-root index.js runs a debug self-test at import time
// whenever `module.parent` is falsy (true under webpack/Next's bundling),
// crashing on a missing test fixture. Importing the inner module directly
// skips that broken entry point.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

/**
 * Extracts plain text from an uploaded file so it can feed the existing
 * extractBrainFromText() pipeline unchanged. The only place pdf-parse and
 * mammoth are imported (ADR-021) — callers never know which library, if
 * any, handled a given file.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export class UnsupportedFileError extends Error {
  constructor(filename: string) {
    super(`Can't read "${filename}" — try pasting the text instead, or use a .txt/.md/.pdf/.docx file.`);
    this.name = "UnsupportedFileError";
  }
}

export class FileTooLargeError extends Error {
  constructor(filename: string) {
    super(`"${filename}" is too large (max 10MB).`);
    this.name = "FileTooLargeError";
  }
}

function isTextLike(filename: string, mimeType: string): boolean {
  return /\.(txt|md)$/i.test(filename) || mimeType.startsWith("text/");
}

function isPdf(filename: string, mimeType: string): boolean {
  return /\.pdf$/i.test(filename) || mimeType === "application/pdf";
}

function isDocx(filename: string, mimeType: string): boolean {
  return (
    /\.docx$/i.test(filename) ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  if (buffer.byteLength > MAX_BYTES) throw new FileTooLargeError(filename);

  if (isTextLike(filename, mimeType)) {
    return buffer.toString("utf8");
  }
  if (isPdf(filename, mimeType)) {
    const { text } = await pdfParse(buffer);
    return text;
  }
  if (isDocx(filename, mimeType)) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  throw new UnsupportedFileError(filename);
}
