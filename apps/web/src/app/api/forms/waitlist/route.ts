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

const waitlistSchema = z.object({
  email: z.string().email("Invalid email").max(320),
  interest: z.string().max(500).optional(),
  role: z.string().max(200).optional(),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "waitlist");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const interest =
    typeof parsed.payload.interest === "string" ? parsed.payload.interest.trim() : undefined;
  const role = typeof parsed.payload.role === "string" ? parsed.payload.role.trim() : undefined;

  const result = waitlistSchema.safeParse({ email, interest, role });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  const to = process.env.FORM_WAITLIST_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  if (!webhook && (!to || typeof to !== "string")) {
    return withFormRateLimitCookie(
      formErrorResponse("Waitlist form is not configured.", 503),
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
          interest: result.data.interest ?? "",
          role: result.data.role ?? "",
          source: "waitlist",
        }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok)
        return withFormRateLimitCookie(
          formErrorResponse("Join failed. Try again later.", 502),
          rateLimit
        );
    } catch (err) {
      console.warn("[web] Failed to send waitlist form email", err);
      return withFormRateLimitCookie(
        formErrorResponse("Join failed. Try again later.", 502),
        rateLimit
      );
    }
  } else {
    const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
    const { ok, error } = await sendEmail({
      to: to as string,
      from: formatEmailFrom(from),
      subject: `Waitlist: ${result.data.email}`,
      text: [
        `Email: ${escapeEmailText(result.data.email)}`,
        result.data.interest ? `Interest: ${escapeEmailText(result.data.interest)}` : null,
        result.data.role ? `Role: ${escapeEmailText(result.data.role)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (!ok)
      return withFormRateLimitCookie(formErrorResponse(error ?? "Join failed.", 502), rateLimit);
  }

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("waitlist", postHandler);
