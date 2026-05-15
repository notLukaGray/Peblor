import { NextRequest, NextResponse } from "next/server";

// Deferred: replace with asset-scoped magic-link entitlement.
// Previous implementation that issued site-wide access cookies and optionally
// emailed a recipient has been disabled. See remediation PR 1 for context.

// const gatedSchema = z.object({
//   email: z.string().email("Invalid email").max(320),
//   name: z.string().max(500).optional(),
// });

// async function postHandler(request: NextRequest) {
//   const rateLimitRes = checkFormRateLimit(request, "gated-asset");
//   if (rateLimitRes) return rateLimitRes;
//   ...
// }

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "This form has been removed. Asset-gated access will use magic-link authentication." },
    { status: 410 }
  );
}
