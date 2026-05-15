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

const contactSchema = z.object({
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320),
  message: z.string().min(1, "Message is required").max(50_000),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "contact");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : "";
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const message = typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : "";

  const result = contactSchema.safeParse({ name, email, message });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Contact form is not configured.", 503),
      rateLimit
    );
  }

  const subject = `Contact form: ${result.data.name ? `${result.data.name} – ` : ""}${result.data.email}`;
  const text = [
    result.data.name ? `Name: ${escapeEmailText(result.data.name)}` : null,
    `Email: ${escapeEmailText(result.data.email)}`,
    "",
    escapeEmailText(result.data.message),
  ]
    .filter(Boolean)
    .join("\n");

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject,
    text,
    replyTo: result.data.email,
  });

  if (!ok) {
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Failed to send. Try again later.", 502),
      rateLimit
    );
  }

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("contact", postHandler);
