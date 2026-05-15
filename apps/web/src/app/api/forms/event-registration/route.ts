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

const eventSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  message: z.string().max(10_000).optional(),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "event-registration");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : "";
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const message =
    typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : undefined;

  const result = eventSchema.safeParse({ name, email, message });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_EVENT_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Event registration is not configured.", 503),
      rateLimit
    );
  }

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: `Event registration: ${result.data.name} (${result.data.email})`,
    text: [
      `Name: ${escapeEmailText(result.data.name)}`,
      `Email: ${escapeEmailText(result.data.email)}`,
      result.data.message ? `Message: ${escapeEmailText(result.data.message)}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    replyTo: result.data.email,
  });

  if (!ok)
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Registration failed. Try again.", 502),
      rateLimit
    );

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("event-registration", postHandler);
