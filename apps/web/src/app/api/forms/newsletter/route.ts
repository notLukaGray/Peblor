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

const newsletterSchema = z.object({
  email: z.string().email("Invalid email").max(320),
  name: z.string().max(500).optional(),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "newsletter");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : undefined;

  const result = newsletterSchema.safeParse({ email, name });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const webhook = process.env.NEWSLETTER_WEBHOOK_URL ?? process.env.MAILCHIMP_WEBHOOK_URL;
  const to = process.env.FORM_NEWSLETTER_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  if (!webhook && (!to || typeof to !== "string")) {
    return withFormRateLimitCookie(
      formErrorResponse("Newsletter form is not configured.", 503),
      rateLimit
    );
  }
  const WEBHOOK_TIMEOUT_MS = 10_000;
  if (webhook && typeof webhook === "string") {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: result.data.email,
          name: result.data.name ?? "",
          source: "newsletter",
        }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok) {
        return withFormRateLimitCookie(
          formErrorResponse("Subscription failed. Try again later.", 502),
          rateLimit
        );
      }
    } catch (err) {
      console.warn("[web] Failed to send newsletter form email", err);
      return withFormRateLimitCookie(
        formErrorResponse("Subscription failed. Try again later.", 502),
        rateLimit
      );
    }
  } else {
    const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
    const { ok, error } = await sendEmail({
      to: to as string,
      from: formatEmailFrom(from),
      subject: `Newsletter signup: ${result.data.email}`,
      text: [
        result.data.name ? `Name: ${escapeEmailText(result.data.name)}` : null,
        `Email: ${escapeEmailText(result.data.email)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (!ok)
      return withFormRateLimitCookie(formErrorResponse(error ?? "Signup failed.", 502), rateLimit);
  }

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("newsletter", postHandler);
