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

const applicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  message: z.string().max(50_000).optional(),
  fileUrl: z.string().url().max(2000).optional(),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "application");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : "";
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const message =
    typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : undefined;
  const fileUrl =
    typeof parsed.payload.fileUrl === "string" ? parsed.payload.fileUrl.trim() : undefined;

  const result = applicationSchema.safeParse({ name, email, message, fileUrl });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_APPLICATION_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Application form is not configured.", 503),
      rateLimit
    );
  }

  const lines: string[] = [
    `Name: ${escapeEmailText(result.data.name)}`,
    `Email: ${escapeEmailText(result.data.email)}`,
    result.data.message ? `Message: ${escapeEmailText(result.data.message)}` : null,
    result.data.fileUrl ? `File / link: ${escapeEmailText(result.data.fileUrl)}` : null,
  ].filter((x): x is string => x != null);

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: `Application: ${result.data.name} (${result.data.email})`,
    text: lines.join("\n"),
    replyTo: result.data.email,
  });

  if (!ok)
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Failed to submit. Try again.", 502),
      rateLimit
    );

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("application", postHandler);
