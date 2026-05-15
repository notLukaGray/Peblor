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

const feedbackSchema = z
  .object({
    rating: z.union([z.number().finite(), z.string()]).optional(),
    choice: z.string().max(500).optional(),
    comment: z.string().max(10_000).optional(),
  })
  .refine(
    (d) => d.rating !== undefined || d.choice !== undefined || (d.comment && d.comment.trim()),
    { message: "At least one field is required." }
  );

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "feedback");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const rating = parsed.payload.rating;
  const choice =
    typeof parsed.payload.choice === "string" ? parsed.payload.choice.trim() : undefined;
  const comment =
    typeof parsed.payload.comment === "string" ? parsed.payload.comment.trim() : undefined;

  const numRating =
    typeof rating === "number" ? rating : typeof rating === "string" ? Number(rating) : undefined;
  if (numRating != null && !Number.isFinite(numRating)) {
    return withFormRateLimitCookie(formErrorResponse("Invalid rating value.", 400), rateLimit);
  }
  const result = feedbackSchema.safeParse({
    rating: numRating,
    choice,
    comment,
  });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_FEEDBACK_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("Feedback form is not configured.", 503),
      rateLimit
    );
  }

  const lines: string[] = [];
  if (result.data.rating != null) lines.push(`Rating: ${result.data.rating}`);
  if (result.data.choice) lines.push(`Choice: ${escapeEmailText(result.data.choice)}`);
  if (result.data.comment) lines.push(`Comment: ${escapeEmailText(result.data.comment)}`);

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: "Feedback submitted",
    text: lines.join("\n"),
  });

  if (!ok)
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Submission failed. Try again.", 502),
      rateLimit
    );

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("feedback", postHandler);
