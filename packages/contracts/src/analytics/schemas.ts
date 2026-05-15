import { z } from "zod";
import { ANALYTICS_EVENT_NAMES } from "./events";

const analyticsSourceSchema = z.enum(["client", "server"]);

export const analyticsCommonPayloadSchema = z.object({
  pagePath: z.string(),
  sectionId: z.string().optional(),
  elementId: z.string().optional(),
  source: analyticsSourceSchema,
  ts: z.number().int().nonnegative(),
});

const pageViewPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("page_view"),
  title: z.string().optional(),
});

const protectedPageRedirectedPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("protected_page_redirected"),
});

const unlockModalOpenedPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("unlock_modal_opened"),
});

const unlockSubmitAttemptPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("unlock_submit_attempt"),
});

const unlockSuccessPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("unlock_success"),
});

const unlockFailurePayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("unlock_failure"),
});

const formSubmitAttemptPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("form_submit_attempt"),
  handlerKey: z.string(),
});

const formSubmitSuccessPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("form_submit_success"),
  handlerKey: z.string(),
});

const formSubmitErrorPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("form_submit_error"),
  handlerKey: z.string(),
  errorType: z.string(),
});

const contentCtaClickedPayloadSchema = analyticsCommonPayloadSchema.extend({
  event: z.literal("content_cta_clicked"),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const analyticsEventPayloadSchema = z.discriminatedUnion("event", [
  pageViewPayloadSchema,
  protectedPageRedirectedPayloadSchema,
  unlockModalOpenedPayloadSchema,
  unlockSubmitAttemptPayloadSchema,
  unlockSuccessPayloadSchema,
  unlockFailurePayloadSchema,
  formSubmitAttemptPayloadSchema,
  formSubmitSuccessPayloadSchema,
  formSubmitErrorPayloadSchema,
  contentCtaClickedPayloadSchema,
]);

export type AnalyticsEventPayload = z.infer<typeof analyticsEventPayloadSchema>;

const analyticsConditionsSchema = z
  .object({
    minViewportWidth: z.number().optional(),
    maxViewportWidth: z.number().optional(),
    scrollProgress: z.number().min(0).max(1).optional(),
  })
  .optional();

export const analyticsConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    event: z.union([z.enum(ANALYTICS_EVENT_NAMES), z.string().regex(/^custom:.+/)]).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    conditions: analyticsConditionsSchema,
  })
  .optional();

export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;
