import { getAiRuntime } from "@/lib/ai";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const rt = getAiRuntime();
  const aiStatus = {
    provider: rt.provider,
    model: rt.model,
    enabled: rt.enabled,
    disabled: rt.disabled,
    source: rt.source,
    hasKey: rt.apiKey.length > 0,
    isLocal: rt.provider === "ollama" || rt.provider === "lmstudio",
  };
  return (
    <div className="min-h-screen bg-stone-50 px-6">
      <OnboardingWizard aiStatus={aiStatus} />
    </div>
  );
}
