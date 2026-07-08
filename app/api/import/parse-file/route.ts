import { badRequest, ok } from "@/lib/api";
import { extractTextFromFile, UnsupportedFileError, FileTooLargeError } from "@/lib/import/fileText";

export const dynamic = "force-dynamic";

/** POST multipart/form-data with a "file" field -> { text }. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data with a file.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("No file provided.");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.name, file.type);
    return ok({ text });
  } catch (err) {
    if (err instanceof UnsupportedFileError || err instanceof FileTooLargeError) {
      return badRequest(err.message);
    }
    return badRequest("Couldn't read that file — try pasting the text instead.");
  }
}
