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

const jobInquirySchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  role: z.string().max(200).optional(),
  message: z.string().min(1, "Message is required").max(10_000),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "job-inquiry");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : "";
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : "";
  const role = typeof parsed.payload.role === "string" ? parsed.payload.role.trim() : undefined;
  const message = typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : "";

  const result = jobInquirySchema.safeParse({ name, email, role, message });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_JOB_INQUIRY_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Job inquiry form is not configured.", 503),
      rateLimit
    );
  }

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: `Job / collaboration inquiry: ${result.data.name} (${result.data.email})`,
    text: [
      `Name: ${escapeEmailText(result.data.name)}`,
      `Email: ${escapeEmailText(result.data.email)}`,
      result.data.role ? `Role: ${escapeEmailText(result.data.role)}` : null,
      "",
      escapeEmailText(result.data.message),
    ]
      .filter(Boolean)
      .join("\n"),
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

export const POST = withFormAnalytics("job-inquiry", postHandler);
