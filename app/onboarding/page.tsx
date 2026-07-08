import { isAiEnabled } from "@/lib/ai";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-stone-50 px-6">
      <OnboardingWizard aiEnabled={isAiEnabled()} />
    </div>
  );
}
