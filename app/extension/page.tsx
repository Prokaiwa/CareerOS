import { config } from "@/lib/config";
import { getOrCreateExtensionToken, getSetting } from "@/lib/settings";
import { InstallGuide } from "@/components/extension/InstallGuide";

export const dynamic = "force-dynamic";

export default function ExtensionPage() {
  const token = getOrCreateExtensionToken();
  const lastSeen = getSetting("extension_last_seen");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Browser extension</h1>
      <p className="mt-1 text-sm text-stone-500">
        The CareerOS Clipper shows fit scores right on job postings, saves them into your
        pipeline, and can fill application forms from your Career Brain. It talks only to this
        app on your machine.
      </p>
      <InstallGuide token={token} apiUrl={config.appUrl} lastSeen={lastSeen} />
    </div>
  );
}
