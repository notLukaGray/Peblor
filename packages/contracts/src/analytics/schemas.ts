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

// ---------------------------------------------------------------------------
// Event payload configuration
// ---------------------------------------------------------------------------
// Each key is an event name. The value is an object whose keys are the extra
// fields (beyond the common payload and the event literal) that the event
// carries.  An empty object means no extra fields.
const EVENT_PAYLOAD_CONFIG = {
  page_view: { title: z.string().optional() },
  protected_page_redirected: {},
  unlock_modal_opened: {},
  unlock_submit_attempt: {},
  unlock_success: {},
  unlock_failure: {},
  form_submit_attempt: { handlerKey: z.string() },
  form_submit_success: { handlerKey: z.string() },
  form_submit_error: { handlerKey: z.string(), errorType: z.string() },
  content_cta_clicked: { props: z.record(z.string(), z.unknown()).optional() },
} as const satisfies Record<string, Record<string, z.ZodTypeAny>>;

// ---------------------------------------------------------------------------
// Generate the discriminated union from the config
// ---------------------------------------------------------------------------
// Tuple literal (not .map()) so each element retains its precise ZodObject
// type, satisfying Zod v4's $ZodTypeDiscriminable constraint.
const _eventPayloadSchemas = [
  analyticsCommonPayloadSchema.extend({
    event: z.literal("page_view"),
    ...EVENT_PAYLOAD_CONFIG.page_view,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("protected_page_redirected"),
    ...EVENT_PAYLOAD_CONFIG.protected_page_redirected,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("unlock_modal_opened"),
    ...EVENT_PAYLOAD_CONFIG.unlock_modal_opened,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("unlock_submit_attempt"),
    ...EVENT_PAYLOAD_CONFIG.unlock_submit_attempt,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("unlock_success"),
    ...EVENT_PAYLOAD_CONFIG.unlock_success,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("unlock_failure"),
    ...EVENT_PAYLOAD_CONFIG.unlock_failure,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("form_submit_attempt"),
    ...EVENT_PAYLOAD_CONFIG.form_submit_attempt,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("form_submit_success"),
    ...EVENT_PAYLOAD_CONFIG.form_submit_success,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("form_submit_error"),
    ...EVENT_PAYLOAD_CONFIG.form_submit_error,
  }),
  analyticsCommonPayloadSchema.extend({
    event: z.literal("content_cta_clicked"),
    ...EVENT_PAYLOAD_CONFIG.content_cta_clicked,
  }),
] as const;

export const analyticsEventPayloadSchema = z.discriminatedUnion("event", _eventPayloadSchemas);

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
