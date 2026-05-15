export { FORM_HANDLERS, getFormActionUrl, isFormHandlerKey, type FormHandlerKey } from "./registry";
export {
  formSuccessResponse,
  formErrorResponse,
  formRateLimitResponse,
  safeFormRedirect,
  withFormRateLimitCookie,
  type FormRateLimitCookie,
} from "./form-responses";
export {
  getFormRateLimitState,
  getFormRateLimitCookieHeader,
  getClearFormRateLimitCookieHeader,
} from "./form-rate-limit";
export {
  applyFormRateLimit,
  checkFormRateLimit,
  buildFormRateLimitCookie,
} from "./with-form-rate-limit";
export { parseFormBody, type FormPayload } from "./parse-form-body";
export { sendEmail, escapeEmailText } from "./send-email";

const EMAIL_RE = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

export function formatEmailFrom(from: string): string {
  return EMAIL_RE.test(from) ? `Site <${from}>` : from;
}
