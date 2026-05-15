import { withFormAnalytics } from "@/core/lib/forms/analytics-wrapper";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  parseFormBody,
  formSuccessResponse,
  formErrorResponse,
  safeFormRedirect,
  withFormRateLimitCookie,
  sendEmail,
  escapeEmailText,
  formatEmailFrom,
  applyFormRateLimit,
} from "@/core/lib/forms";

const quoteSchema = z.object({
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320),
  budget: z.string().max(200).optional(),
  timeline: z.string().max(500).optional(),
  brief: z.string().min(1, "Brief is required").max(20_000),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "quote-request");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : undefined;
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const budget =
    typeof parsed.payload.budget === "string" ? parsed.payload.budget.trim() : undefined;
  const timeline =
    typeof parsed.payload.timeline === "string" ? parsed.payload.timeline.trim() : undefined;
  const brief = typeof parsed.payload.brief === "string" ? parsed.payload.brief.trim() : "";

  const result = quoteSchema.safeParse({ name, email, budget, timeline, brief });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_QUOTE_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Quote request form is not configured.", 503),
      rateLimit
    );
  }

  const lines: string[] = [
    result.data.name ? `Name: ${escapeEmailText(result.data.name)}` : null,
    `Email: ${escapeEmailText(result.data.email)}`,
    result.data.budget ? `Budget: ${escapeEmailText(result.data.budget)}` : null,
    result.data.timeline ? `Timeline: ${escapeEmailText(result.data.timeline)}` : null,
    "",
    "Brief:",
    escapeEmailText(result.data.brief),
  ].filter((x): x is string => x != null);

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: `Quote / project request: ${result.data.email}`,
    text: lines.join("\n"),
    replyTo: result.data.email,
  });

  if (!ok)
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Failed to send. Try again.", 502),
      rateLimit
    );

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("quote-request", postHandler);
