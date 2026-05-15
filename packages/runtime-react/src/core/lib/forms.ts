/**
 * Allowlisted form handlers. Runtime only needs URL lookup for section form blocks.
 */
const FORM_HANDLERS: Record<string, string> = {
  unlock: "/api/unlock",
  contact: "/api/forms/contact",
  newsletter: "/api/forms/newsletter",
  waitlist: "/api/forms/waitlist",
  "event-registration": "/api/forms/event-registration",
  feedback: "/api/forms/feedback",
  // "gated-asset" removed — returns 410. Deferred for magic-link entitlement.
  "job-inquiry": "/api/forms/job-inquiry",
  "quote-request": "/api/forms/quote-request",
  application: "/api/forms/application",
  rsvp: "/api/forms/rsvp",
  unsubscribe: "/api/forms/unsubscribe",
  // "password-reset" and "magic-link" stubs hidden until implemented.
  // Deferred: magic-link auth system, not yet implemented.
};

export function getFormActionUrl(action: string): string | null {
  if (typeof action !== "string" || !action.trim()) return null;
  const key = action.trim();
  return FORM_HANDLERS[key] ?? null;
}
