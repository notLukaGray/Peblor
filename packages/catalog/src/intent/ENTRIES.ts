/**
 * Registry of all known catalog entry IDs.
 * CI-gated: every ID here must have a corresponding *.intent.yaml file.
 * Add new cluster/trigger/motion-preset IDs here and create the intent file
 * in the same PR — catalog:check-coverage will fail otherwise.
 */

export const CLUSTER_ENTRIES = [
  // Elements
  "element.image",
  "element.video",
  "element.heading",
  "element.button",
  "element.body",
  "element.link",
  "element.vector",
  "element.svg",
  "element.richText",
  "element.range",
  "element.input",
  "element.videoTime",
  "element.videoQualitySelect",
  "element.spacer",
  "element.divider",
  "element.scrollProgressBar",
  "element.model3d",
  "element.rive",
  "element.group",
  "element.infiniteScroll",
  "element.formField",
  "element.audio",
  "element.counter",
  "element.marquee",
  "element.imageCompare",
  "element.tabs",
  "element.tooltip",
  "element.lottie",
  // Sections
  "section.column",
  "section.contentBlock",
  "section.scrollContainer",
  "section.divider",
  "section.trigger",
  "section.formBlock",
  "section.reveal",
  // Section capabilities
  "section.sticky",
  "section.fixed",
  "section.reorder",
  "section.parallax",
  "section.visibleWhen",
  "section.effects",
  "section.scrollOpacity",
  // Backgrounds
  "background.video",
  "background.image",
  "background.variable",
  "background.pattern",
  "background.transition",
  // Module & Modal
  "module",
  "modal",
] as const;

export const TRIGGER_ENTRIES = [
  "trigger.onVisible",
  "trigger.onInvisible",
  "trigger.onProgress",
  "trigger.onViewportProgress",
  "trigger.onClick",
  "trigger.keyboard",
  "trigger.timer",
  "trigger.cursor",
  "trigger.scrollDirection",
  "trigger.idle",
  "trigger.onVideoPlay",
  "trigger.onVideoPause",
  "trigger.onVideoEnd",
  "trigger.pointerDown",
  "trigger.pointerUp",
] as const;

export const MOTION_PRESET_ENTRIES = [
  "motion.fade",
  "motion.slideUp",
  "motion.slideDown",
  "motion.slideLeft",
  "motion.slideRight",
  "motion.zoomIn",
  "motion.zoomOut",
  "motion.popIn",
  "motion.blurIn",
  "motion.tiltIn",
  // Motion gestures & interactions
  "motion.whileHover",
  "motion.whileTap",
  "motion.whileFocus",
  "motion.whileInView",
  "motion.drag",
  "motion.layout",
  // Motion timing & sequencing
  "motion.stagger",
  "motion.trigger",
  "motion.exitTrigger",
  // Motion accessibility & config
  "motion.reduceMotion",
  "motion.inherit",
] as const;

export const ALL_ENTRIES = [
  ...CLUSTER_ENTRIES,
  ...TRIGGER_ENTRIES,
  ...MOTION_PRESET_ENTRIES,
] as const;
