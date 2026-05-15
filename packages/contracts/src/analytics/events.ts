export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "protected_page_redirected",
  "unlock_modal_opened",
  "unlock_submit_attempt",
  "unlock_success",
  "unlock_failure",
  "form_submit_attempt",
  "form_submit_success",
  "form_submit_error",
  "content_cta_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsEventKey = AnalyticsEventName | `custom:${string}`;
