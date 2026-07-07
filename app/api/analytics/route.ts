import { buildAnalyticsReport } from "@/lib/analytics";
import { ok } from "@/lib/api";

/**
 * GET /api/analytics — the full deterministic AnalyticsReport (funnel,
 * rates, response time, velocity, effectiveness, sources, skill-gap trend,
 * goal progress, and week/month/year period summaries). No AI, no params.
 */
export async function GET() {
  return ok(buildAnalyticsReport());
}
