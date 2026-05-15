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

const rsvpSchema = z.object({
  attending: z.union([
    z.boolean(),
    z.literal("yes"),
    z.literal("no"),
    z.string().transform((s) => s.toLowerCase() === "yes" || s === "1"),
  ]),
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320).optional(),
  dietary: z.string().max(1000).optional(),
  accessNeeds: z.string().max(1000).optional(),
});

async function postHandler(request: NextRequest) {
  const rateLimit = applyFormRateLimit(request, "rsvp");
  if (rateLimit instanceof NextResponse) return rateLimit;

  const parsed = await parseFormBody(request);
  if (parsed instanceof NextResponse) return withFormRateLimitCookie(parsed, rateLimit);

  const attendingRaw = parsed.payload.attending;
  const attending =
    typeof attendingRaw === "boolean"
      ? attendingRaw
      : attendingRaw === "yes" || attendingRaw === "1"
        ? true
        : attendingRaw === "no" || attendingRaw === "0"
          ? false
          : undefined;
  const name = typeof parsed.payload.name === "string" ? parsed.payload.name.trim() : undefined;
  const email = typeof parsed.payload.email === "string" ? parsed.payload.email.trim() : undefined;
  const dietary =
    typeof parsed.payload.dietary === "string" ? parsed.payload.dietary.trim() : undefined;
  const accessNeeds =
    typeof parsed.payload.accessNeeds === "string" ? parsed.payload.accessNeeds.trim() : undefined;

  const result = rsvpSchema.safeParse({
    attending: attending ?? false,
    name,
    email,
    dietary,
    accessNeeds,
  });
  if (!result.success) {
    const msg = result.error.flatten().formErrors[0] ?? result.error.message;
    return withFormRateLimitCookie(
      formErrorResponse(typeof msg === "string" ? msg : "Invalid input.", 400),
      rateLimit
    );
  }

  const to = process.env.FORM_RSVP_RECIPIENT ?? process.env.FORM_CONTACT_RECIPIENT;
  if (!to || typeof to !== "string") {
    return withFormRateLimitCookie(
      formErrorResponse("RSVP form is not configured.", 503),
      rateLimit
    );
  }
  const from = process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
  const lines: string[] = [
    `Attending: ${result.data.attending ? "Yes" : "No"}`,
    result.data.name ? `Name: ${escapeEmailText(result.data.name)}` : null,
    result.data.email ? `Email: ${escapeEmailText(result.data.email)}` : null,
    result.data.dietary ? `Dietary: ${escapeEmailText(result.data.dietary)}` : null,
    result.data.accessNeeds ? `Access needs: ${escapeEmailText(result.data.accessNeeds)}` : null,
  ].filter((x): x is string => x != null);

  const { ok, error } = await sendEmail({
    to,
    from: formatEmailFrom(from),
    subject: `RSVP: ${result.data.attending ? "Yes" : "No"}${result.data.name ? ` – ${result.data.name}` : ""}`,
    text: lines.join("\n"),
    ...(result.data.email && { replyTo: result.data.email }),
  });
  if (!ok)
    return withFormRateLimitCookie(
      formErrorResponse(error ?? "Failed to send. Try again later.", 502),
      rateLimit
    );

  return withFormRateLimitCookie(
    formSuccessResponse(safeFormRedirect(parsed.payload.redirect)),
    rateLimit
  );
}

export const POST = withFormAnalytics("rsvp", postHandler);
