"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { timingSafeEqual, createHash } from "crypto";

import { sendEmail, escapeEmailText, formatEmailFrom } from "@/core/lib/forms";
import { checkActionRateLimit } from "@/core/actions/server-action-rate-limit";
import { buildFingerprint } from "@/core/lib/rate-limit/fingerprint";

import { createAccessToken, verifyAccessToken } from "@/core/lib/access-cookie";
import { accessCookieName, accessCookieMaxAgeDays } from "@/core/lib/auth-constants";
import {
  getUnlockRateLimitState,
  getRateLimitCookieHeader as getUnlockRateLimitCookieHeader,
  getClearRateLimitCookieHeader as getClearUnlockRateLimitCookieHeader,
} from "@/core/lib/unlock-rate-limit";
import { rateLimitMaxAttempts } from "@/core/lib/globals";
import { safeRedirectPath } from "@/core/lib/unlock-linking";
import { getTrustedFormSiteOrigins, isLocalhostOrigin } from "@/core/lib/forms/form-same-origin";

import type { ActionResult } from "@pb/runtime-react/core/lib/form-action-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a string value from the flat payload, trimming whitespace. */
function str(data: Record<string, string | string[] | boolean>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Extract an optional string. */
function optStr(
  data: Record<string, string | string[] | boolean>,
  key: string
): string | undefined {
  const v = data[key];
  return typeof v === "string" ? v.trim() : undefined;
}

/** Resolve the sender address from env vars. */
function resolveFormFrom(): string {
  return process.env.FORM_CONTACT_FROM ?? process.env.RESEND_FROM ?? "noreply@localhost";
}

/**
 * Extract a user-facing error message from a Zod parse failure.
 * Prefers `formErrors[0]` (top-level refine messages), falls back to the
 * raw error message, then to a generic string.
 */
function extractParseError(parsed: { success: false; error: z.ZodError }): string {
  const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
  return typeof msg === "string" ? msg : "Invalid input.";
}

// ---------------------------------------------------------------------------
// Form action factory
// ---------------------------------------------------------------------------

/**
 * Configuration for a standard form server action.
 *
 * The factory handles rate-limiting, Zod parsing, error extraction, recipient
 * resolution, email/webhook sending, and redirect. Each action supplies the
 * parts that are unique: schema, input mapping, subject, body, and env keys.
 */
type FormActionConfig<T> = {
  /** Rate-limit key passed to `checkActionRateLimit`. */
  actionKey: string;
  /** Zod schema for the parsed input. */
  schema: z.ZodSchema<T>;
  /**
   * Build the object passed to `schema.safeParse` from the raw form data.
   * Called after rate-limiting. Can return a pre-processed value or
   * `{ __error: "message" }` to short-circuit with an error (for actions
   * that need custom validation before schema parse).
   */
  buildInput: (
    data: Record<string, string | string[] | boolean>
  ) => Record<string, unknown> | { __error: string };
  /** Env var for the email recipient. Falls back to FORM_CONTACT_RECIPIENT. */
  recipientEnvKey: string;
  /** Human-readable label used in the "not configured" error message. */
  formLabel: string;
  /** Message shown when the email send fails. */
  failureMessage: string;
  /** Build the email subject line from the parsed data. */
  buildSubject: (parsed: T) => string;
  /** Build the email body as an array of lines (null entries are filtered out). */
  buildBody: (parsed: T) => Array<string | null>;
  /** Optional reply-to address builder. */
  buildReplyTo?: (parsed: T) => string | undefined;
  /** Env var(s) for an optional webhook URL. First set value wins. When set, POSTs JSON before falling back to email. */
  webhookEnvKey?: string | string[];
  /** Build the webhook POST body from the parsed data. */
  buildWebhookBody?: (parsed: T) => Record<string, unknown>;
};

function createFormAction<T>(config: FormActionConfig<T>) {
  return async function action(
    data: Record<string, string | string[] | boolean>
  ): Promise<ActionResult> {
    // 1. Rate limit
    const rl = await checkActionRateLimit(config.actionKey);
    if (!rl.ok) return { error: rl.error };

    // 2. Build and parse input
    const input = config.buildInput(data);
    if ("__error" in input && typeof input.__error === "string") {
      return { error: String(input.__error) };
    }

    const parsed = config.schema.safeParse(input);
    if (!parsed.success) {
      return { error: extractParseError(parsed) };
    }

    // 3. Webhook path (optional)
    if (config.webhookEnvKey && config.buildWebhookBody) {
      const keys = Array.isArray(config.webhookEnvKey)
        ? config.webhookEnvKey
        : [config.webhookEnvKey];
      const webhookUrl = keys.reduce<string | undefined>(
        (found, key) => found ?? process.env[key] ?? undefined,
        undefined
      );
      if (webhookUrl && typeof webhookUrl === "string") {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config.buildWebhookBody(parsed.data)),
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return { error: config.failureMessage };
        } catch {
          return { error: config.failureMessage };
        }
        return { redirect: safeRedirectPath(data.redirect) ?? undefined };
      }
    }

    // 4. Email path
    const to = process.env[config.recipientEnvKey] ?? process.env.FORM_CONTACT_RECIPIENT;
    if (!to) return { error: `${config.formLabel} form is not configured.` };

    const from = resolveFormFrom();
    const subject = config.buildSubject(parsed.data);
    const text = config
      .buildBody(parsed.data)
      .filter((x): x is string => x != null)
      .join("\n");
    const replyTo = config.buildReplyTo?.(parsed.data);

    const { ok, error } = await sendEmail({
      to,
      from: formatEmailFrom(from),
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    if (!ok) return { error: error ?? config.failureMessage };

    return { redirect: safeRedirectPath(data.redirect) ?? undefined };
  };
}

// ---------------------------------------------------------------------------
// Form server actions (generated via factory)
// ---------------------------------------------------------------------------

// ---- contact ---------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320),
  message: z.string().min(1, "Message is required").max(50_000),
});

export const contactAction = createFormAction({
  actionKey: "contact",
  schema: contactSchema,
  buildInput: (data) => ({
    name: str(data, "name") || undefined,
    email: str(data, "email"),
    message: str(data, "message"),
  }),
  recipientEnvKey: "FORM_CONTACT_RECIPIENT",
  formLabel: "Contact",
  failureMessage: "Failed to send. Try again later.",
  buildSubject: (p) => `Contact form: ${p.name ? `${p.name} – ` : ""}${p.email}`,
  buildBody: (p) => [
    p.name ? `Name: ${escapeEmailText(p.name)}` : null,
    `Email: ${escapeEmailText(p.email)}`,
    "",
    escapeEmailText(p.message),
  ],
  buildReplyTo: (p) => p.email,
});

// ---- newsletter ------------------------------------------------------------

const newsletterSchema = z.object({
  email: z.string().email("Invalid email").max(320),
  name: z.string().max(500).optional(),
});

export const newsletterAction = createFormAction({
  actionKey: "newsletter",
  schema: newsletterSchema,
  buildInput: (data) => ({
    email: str(data, "email"),
    name: str(data, "name") || undefined,
  }),
  recipientEnvKey: "FORM_NEWSLETTER_RECIPIENT",
  formLabel: "Newsletter",
  failureMessage: "Signup failed.",
  buildSubject: (p) => `Newsletter signup: ${p.email}`,
  buildBody: (p) => [
    p.name ? `Name: ${escapeEmailText(p.name)}` : null,
    `Email: ${escapeEmailText(p.email)}`,
  ],
  webhookEnvKey: ["NEWSLETTER_WEBHOOK_URL", "MAILCHIMP_WEBHOOK_URL"],
  buildWebhookBody: (p) => ({
    email: p.email,
    name: p.name ?? "",
    source: "newsletter",
  }),
});

// ---- waitlist --------------------------------------------------------------

const waitlistSchema = z.object({
  email: z.string().email("Invalid email").max(320),
  interest: z.string().max(500).optional(),
  role: z.string().max(200).optional(),
});

export const waitlistAction = createFormAction({
  actionKey: "waitlist",
  schema: waitlistSchema,
  buildInput: (data) => ({
    email: str(data, "email"),
    interest: optStr(data, "interest"),
    role: optStr(data, "role"),
  }),
  recipientEnvKey: "FORM_WAITLIST_RECIPIENT",
  formLabel: "Waitlist",
  failureMessage: "Join failed.",
  buildSubject: (p) => `Waitlist: ${p.email}`,
  buildBody: (p) => [
    `Email: ${escapeEmailText(p.email)}`,
    p.interest ? `Interest: ${escapeEmailText(p.interest)}` : null,
    p.role ? `Role: ${escapeEmailText(p.role)}` : null,
  ],
  webhookEnvKey: "WAITLIST_WEBHOOK_URL",
  buildWebhookBody: (p) => ({
    email: p.email,
    interest: p.interest ?? "",
    role: p.role ?? "",
    source: "waitlist",
  }),
});

// ---- event-registration ---------------------------------------------------

const eventSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  message: z.string().max(10_000).optional(),
});

export const eventRegistrationAction = createFormAction({
  actionKey: "event-registration",
  schema: eventSchema,
  buildInput: (data) => ({
    name: str(data, "name"),
    email: str(data, "email"),
    message: optStr(data, "message"),
  }),
  recipientEnvKey: "FORM_EVENT_RECIPIENT",
  formLabel: "Event registration",
  failureMessage: "Registration failed. Try again.",
  buildSubject: (p) => `Event registration: ${p.name} (${p.email})`,
  buildBody: (p) => [
    `Name: ${escapeEmailText(p.name)}`,
    `Email: ${escapeEmailText(p.email)}`,
    p.message ? `Message: ${escapeEmailText(p.message)}` : null,
  ],
  buildReplyTo: (p) => p.email,
});

// ---- feedback --------------------------------------------------------------

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

export const feedbackAction = createFormAction({
  actionKey: "feedback",
  schema: feedbackSchema,
  buildInput: (data) => {
    const ratingRaw = data.rating;
    const numRating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : typeof ratingRaw === "string"
          ? Number(ratingRaw)
          : undefined;
    if (numRating != null && !Number.isFinite(numRating)) {
      return { __error: "Invalid rating value." };
    }
    return {
      rating: numRating,
      choice: optStr(data, "choice"),
      comment: optStr(data, "comment"),
    };
  },
  recipientEnvKey: "FORM_FEEDBACK_RECIPIENT",
  formLabel: "Feedback",
  failureMessage: "Submission failed. Try again.",
  buildSubject: () => "Feedback submitted",
  buildBody: (p) => [
    p.rating != null ? `Rating: ${p.rating}` : null,
    p.choice ? `Choice: ${escapeEmailText(p.choice)}` : null,
    p.comment ? `Comment: ${escapeEmailText(p.comment)}` : null,
  ],
});

// ---- job-inquiry -----------------------------------------------------------

const jobInquirySchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  role: z.string().max(200).optional(),
  message: z.string().min(1, "Message is required").max(10_000),
});

export const jobInquiryAction = createFormAction({
  actionKey: "job-inquiry",
  schema: jobInquirySchema,
  buildInput: (data) => ({
    name: str(data, "name"),
    email: str(data, "email"),
    role: optStr(data, "role"),
    message: str(data, "message"),
  }),
  recipientEnvKey: "FORM_JOB_INQUIRY_RECIPIENT",
  formLabel: "Job inquiry",
  failureMessage: "Failed to send. Try again.",
  buildSubject: (p) => `Job / collaboration inquiry: ${p.name} (${p.email})`,
  buildBody: (p) => [
    `Name: ${escapeEmailText(p.name)}`,
    `Email: ${escapeEmailText(p.email)}`,
    p.role ? `Role: ${escapeEmailText(p.role)}` : null,
    "",
    escapeEmailText(p.message),
  ],
  buildReplyTo: (p) => p.email,
});

// ---- quote-request ---------------------------------------------------------

const quoteSchema = z.object({
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320),
  budget: z.string().max(200).optional(),
  timeline: z.string().max(500).optional(),
  brief: z.string().min(1, "Brief is required").max(20_000),
});

export const quoteRequestAction = createFormAction({
  actionKey: "quote-request",
  schema: quoteSchema,
  buildInput: (data) => ({
    name: optStr(data, "name"),
    email: str(data, "email"),
    budget: optStr(data, "budget"),
    timeline: optStr(data, "timeline"),
    brief: str(data, "brief"),
  }),
  recipientEnvKey: "FORM_QUOTE_RECIPIENT",
  formLabel: "Quote request",
  failureMessage: "Failed to send. Try again.",
  buildSubject: (p) => `Quote / project request: ${p.email}`,
  buildBody: (p) => [
    p.name ? `Name: ${escapeEmailText(p.name)}` : null,
    `Email: ${escapeEmailText(p.email)}`,
    p.budget ? `Budget: ${escapeEmailText(p.budget)}` : null,
    p.timeline ? `Timeline: ${escapeEmailText(p.timeline)}` : null,
    "",
    "Brief:",
    escapeEmailText(p.brief),
  ],
  buildReplyTo: (p) => p.email,
});

// ---- application -----------------------------------------------------------

const applicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(500),
  email: z.string().email("Invalid email").max(320),
  message: z.string().max(50_000).optional(),
  fileUrl: z.string().url().max(2000).optional(),
});

export const applicationAction = createFormAction({
  actionKey: "application",
  schema: applicationSchema,
  buildInput: (data) => ({
    name: str(data, "name"),
    email: str(data, "email"),
    message: optStr(data, "message"),
    fileUrl: optStr(data, "fileUrl"),
  }),
  recipientEnvKey: "FORM_APPLICATION_RECIPIENT",
  formLabel: "Application",
  failureMessage: "Failed to submit. Try again.",
  buildSubject: (p) => `Application: ${p.name} (${p.email})`,
  buildBody: (p) => [
    `Name: ${escapeEmailText(p.name)}`,
    `Email: ${escapeEmailText(p.email)}`,
    p.message ? `Message: ${escapeEmailText(p.message)}` : null,
    p.fileUrl ? `File / link: ${escapeEmailText(p.fileUrl)}` : null,
  ],
  buildReplyTo: (p) => p.email,
});

// ---- rsvp ------------------------------------------------------------------

const rsvpSchema = z.object({
  attending: z.union([z.literal(true), z.literal(false)]),
  name: z.string().max(500).optional(),
  email: z.string().email("Invalid email").max(320).optional(),
  dietary: z.string().max(1000).optional(),
  accessNeeds: z.string().max(1000).optional(),
});

export const rsvpAction = createFormAction({
  actionKey: "rsvp",
  schema: rsvpSchema,
  buildInput: (data) => {
    const attendingRaw = data.attending;
    const attending =
      typeof attendingRaw === "boolean"
        ? attendingRaw
        : attendingRaw === "yes" || attendingRaw === "1"
          ? true
          : attendingRaw === "no" || attendingRaw === "0"
            ? false
            : undefined;
    if (attending === undefined) {
      return { __error: "The attending field is required and must be yes or no." };
    }
    return {
      attending,
      name: optStr(data, "name"),
      email: optStr(data, "email"),
      dietary: optStr(data, "dietary"),
      accessNeeds: optStr(data, "accessNeeds"),
    };
  },
  recipientEnvKey: "FORM_RSVP_RECIPIENT",
  formLabel: "RSVP",
  failureMessage: "Failed to send. Try again later.",
  buildSubject: (p) => `RSVP: ${p.attending ? "Yes" : "No"}${p.name ? ` – ${p.name}` : ""}`,
  buildBody: (p) => [
    `Attending: ${p.attending ? "Yes" : "No"}`,
    p.name ? `Name: ${escapeEmailText(p.name)}` : null,
    p.email ? `Email: ${escapeEmailText(p.email)}` : null,
    p.dietary ? `Dietary: ${escapeEmailText(p.dietary)}` : null,
    p.accessNeeds ? `Access needs: ${escapeEmailText(p.accessNeeds)}` : null,
  ],
  buildReplyTo: (p) => p.email,
});

// ---- unsubscribe -----------------------------------------------------------

const unsubscribeSchema = z.object({
  email: z.string().email("Invalid email").max(320),
  lists: z.union([z.string(), z.array(z.string())]).optional(),
  preferences: z.record(z.string(), z.boolean()).optional(),
});

function normalizeLists(lists: unknown): string[] {
  if (Array.isArray(lists))
    return lists.filter((x): x is string => typeof x === "string").slice(0, 20);
  if (typeof lists === "string")
    return lists
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 20);
  return [];
}

function coercePreferences(prefs: unknown): Record<string, boolean> | undefined {
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    return Object.fromEntries(
      Object.entries(prefs).filter(
        (e): e is [string, boolean] => typeof e[0] === "string" && typeof e[1] === "boolean"
      )
    ) as Record<string, boolean>;
  }
  return undefined;
}

export const unsubscribeAction = createFormAction({
  actionKey: "unsubscribe",
  schema: unsubscribeSchema,
  buildInput: (data) => ({
    email: str(data, "email"),
    lists: normalizeLists(data.lists ?? data.unsubscribeFrom),
    preferences: coercePreferences(data.preferences),
  }),
  recipientEnvKey: "FORM_UNSUBSCRIBE_RECIPIENT",
  formLabel: "Unsubscribe",
  failureMessage: "Update notification failed. Try again later.",
  buildSubject: (p) => `Unsubscribe / preferences: ${p.email}`,
  buildBody: (p) => [
    `Email: ${escapeEmailText(p.email)}`,
    p.lists?.length
      ? `Unsubscribe from: ${(Array.isArray(p.lists) ? p.lists : [p.lists]).map(escapeEmailText).join(", ")}`
      : "Unsubscribe from all",
    p.preferences && Object.keys(p.preferences).length > 0
      ? `Preferences: ${JSON.stringify(p.preferences)}`
      : null,
  ],
  webhookEnvKey: "UNSUBSCRIBE_WEBHOOK_URL",
  buildWebhookBody: (p) => ({
    email: p.email,
    lists: p.lists ?? [],
    preferences: p.preferences ?? {},
    source: "unsubscribe",
  }),
});

// ---------------------------------------------------------------------------
// Unlock (password-protected page access)
// ---------------------------------------------------------------------------

function validatePassword(password: string): boolean {
  const secret = process.env.SITE_PASSWORD;
  if (typeof secret !== "string") return false;
  // Hash both sides to constant length (32 bytes) so timingSafeEqual always
  // receives equal-length buffers — no early length-return that leaks the
  // password byte length via timing side channel.
  const hashInput = createHash("sha256").update(password).digest();
  const hashSecret = createHash("sha256").update(secret).digest();
  try {
    return timingSafeEqual(hashInput, hashSecret);
  } catch (err) {
    console.warn("[unlock] timingSafeEqual failed for password validation", err);
    return false;
  }
}

function hasAllowedOriginHeader(originOrReferer: string | null): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (!originOrReferer) return false;
  // Allow localhost (any port) so password-protected pages work during local
  // development even when NEXT_PUBLIC_SITE_URL points to a production domain.
  if (isLocalhostOrigin(originOrReferer)) return true;
  const bases = getTrustedFormSiteOrigins();
  if (bases.length === 0) {
    // Reject in production (misconfigured deploy)
    return false;
  }
  try {
    const requestOrigin = new URL(originOrReferer).origin;
    return bases.some((base) => requestOrigin === base);
  } catch (err) {
    console.warn("[unlock] Failed to validate allowed origin header", err);
    return false;
  }
}

export async function unlockAction(
  data: Record<string, string | string[] | boolean>
): Promise<ActionResult> {
  const headersList = await headers();
  const cookieStore = await cookies();

  // Origin check
  const originOrReferer = headersList.get("origin") ?? headersList.get("referer");
  if (!hasAllowedOriginHeader(originOrReferer)) {
    return { error: "Forbidden." };
  }

  const secret = process.env.SITE_PASSWORD;
  if (!secret) {
    return { error: "Password protection is not configured." };
  }

  const password = typeof data.password === "string" ? data.password.trim() : "";
  const redirect = typeof data.redirect === "string" ? data.redirect.trim() : "/";

  // Already has access
  if (verifyAccessToken(cookieStore.get(accessCookieName)?.value)) {
    return { redirect: safeRedirectPath(redirect) ?? "/" };
  }

  // Rate limit check (before empty-password guard so locked-out users
  // can't bypass by submitting empty passwords)
  const fp = buildFingerprint({ headers: headersList as unknown as Headers }, "unlock");
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const rateState = getUnlockRateLimitState(cookieHeader, fp);
  if (rateState.locked && rateState.lockedUntil != null) {
    return { error: "Too many failed attempts. Please try again later." };
  }

  if (!password) return { error: "Password is required." };

  if (!validatePassword(password)) {
    const rateLimitCookieData = getUnlockRateLimitCookieHeader(
      rateState.count,
      fp,
      headersList as unknown as Headers
    );
    if (rateLimitCookieData) {
      try {
        cookieStore.set(rateLimitCookieData.name, rateLimitCookieData.value, {
          path: rateLimitCookieData.path ?? "/",
          httpOnly: rateLimitCookieData.httpOnly ?? true,
          secure: rateLimitCookieData.secure ?? process.env.NODE_ENV === "production",
          sameSite: (rateLimitCookieData.sameSite?.toLowerCase() ?? "lax") as
            | "lax"
            | "strict"
            | "none",
          maxAge: rateLimitCookieData.maxAge,
        });
      } catch (e) {
        console.warn("[unlock] Failed to set rate-limit cookie", e);
      }
    }

    const locked = rateState.count + 1 >= rateLimitMaxAttempts;
    return {
      error: locked ? "Too many failed attempts. Try again in 15 minutes." : "Incorrect password.",
    };
  }

  // Success — set access cookie
  const token = createAccessToken();
  if (!token) return { error: "Could not set access cookie." };
  try {
    cookieStore.set(accessCookieName, token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: accessCookieMaxAgeDays * 24 * 60 * 60,
    });
  } catch (e) {
    console.warn("[unlock] Failed to set access cookie", e);
    return { error: "Could not set access cookie." };
  }

  // Clear unlock rate-limit cookie
  const clearCookieData = getClearUnlockRateLimitCookieHeader(headersList as unknown as Headers);
  if (clearCookieData) {
    try {
      cookieStore.set(clearCookieData.name, clearCookieData.value, {
        path: clearCookieData.path ?? "/",
        maxAge: clearCookieData.maxAge ?? 0,
        httpOnly: clearCookieData.httpOnly ?? true,
        secure: clearCookieData.secure ?? process.env.NODE_ENV === "production",
        sameSite: (clearCookieData.sameSite?.toLowerCase() ?? "lax") as "lax" | "strict" | "none",
      });
    } catch {
      // non-critical
    }
  }

  return { redirect: safeRedirectPath(redirect) ?? "/" };
}
