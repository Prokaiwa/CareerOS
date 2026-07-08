import { isAiEnabled } from "@/lib/ai";
import { ImportWizard } from "@/components/import/ImportWizard";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const aiEnabled = isAiEnabled();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Import</h1>
      <p className="mt-1 text-sm text-stone-500">
        Paste (or upload) a résumé or cover letter and CareerOS will propose experiences, skills,
        education, and more for your Career Brain. Nothing is added until you review and confirm
        each item below.
      </p>
      <p className="mt-2 text-xs text-stone-400">
        Tip: exporting from LinkedIn? Use LinkedIn&apos;s own &quot;Save to PDF&quot; or data
        export, then copy the text in — CareerOS doesn&apos;t log into other sites on your behalf.
      </p>

      <ImportWizard aiEnabled={aiEnabled} />
    </div>
  );
}
