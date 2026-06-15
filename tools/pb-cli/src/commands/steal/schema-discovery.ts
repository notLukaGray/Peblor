// Schema discovery — list of MCP explain_* calls the AI must run before writing JSON.
// Extracted from steal-prompts-generate.ts. Returns the full schemaDiscovery array.

export function schemaDiscoveryCalls(): Array<Record<string, unknown>> {
  return [
    {
      label: "MANDATORY-explain-all-types",
      note: "Run ALL of the following explain calls IN ONE PARALLEL BATCH before writing any JSON. Every element type and section type is covered — no judgment call required, no skipping.",
    },
    // Section types
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "contentBlock" },
      note: "Flex container — the main building block for every section. Use for nav, hero, feature rows, CTA, footer.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "sectionColumn" },
      note: "CSS grid layout — equal-column card grids, pricing tiers, feature tiles, team grids.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "scrollContainer" },
      note: "Scrollable contentBlock variant — for sections with internal overflow scroll.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "sectionTrigger" },
      note: "Invisible viewport sentinel — fires actions when scrolled into view. No visual output.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "formBlock" },
      note: "Form container with fields array — contact forms, newsletter signups, waitlist forms.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "revealSection" },
      note: "Accordion / expandable section — FAQ items, collapsible detail panels.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "divider" },
      note: "Visual spacer or horizontal rule between sections.",
    },
    {
      tool: "mcp__peblor__explain_section_type",
      params: { type: "pageTrigger" },
      note: "Fires onMount/onUnmount actions when the page itself loads/unloads. Niche.",
    },
    // Element types — ALL
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementGroup" },
      note: "CRITICAL flex/grid container for nesting elements. Children MUST go in section:{elementOrder,definitions}.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementHeading" },
      note: "Single typographic heading — h1 display titles, h2 section titles, h3/h4 labels.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementBody" },
      note: "Paragraph / body copy — lead text, descriptions, captions, fine print.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementLink" },
      note: "Inline or standalone hyperlink. Uses 'label' (not 'text') and 'linkDefault' (not 'color').",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementButton" },
      note: "CTA button with optional pill wrapper. Uses 'label', 'href', 'level', 'linkDefault'.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementImage" },
      note: "Raster image (jpg/png/webp/gif). Set explicit height for hero images.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementVideo" },
      note: "Video player — mp4, HLS, or DASH. Always include poster.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementAudio" },
      note: "Audio player — podcast players, music players, audio testimonials.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementSVG" },
      note: "Inline SVG markup — decorative shapes, icon illustrations, brand marks.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementVector" },
      note: "Vector asset reference (from content/assets) — logo or icon file referenced by key.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementRichText" },
      note: "Formatted body copy with inline markup (bold, italic, links, lists).",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementSpacer" },
      note: "Explicit empty gap between elements without affecting flex layout.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementDivider" },
      note: "Horizontal rule or thin separator line between content blocks.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementMarquee" },
      note: "Horizontally scrolling ticker / logo strip — infinite-scroll marquee.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementCounter" },
      note: "Animated number counter — stat callouts (e.g. '33,000+'). Counts up on scroll-into-view.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementTabs" },
      note: "Tabbed interface — feature comparison tabs, switchable content panels.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementLottie" },
      note: "Lottie JSON animation — lightweight vector animations.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementRive" },
      note: "Rive interactive animation — state-machine animations.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementModel3D" },
      note: "Three.js 3D model viewer — GLTF/GLB model display.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementInfiniteScroll" },
      note: "Snap-scrolling carousel / infinite loop — testimonial sliders, feature showcases.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementScrollProgressBar" },
      note: "Scroll-progress indicator — thin bar that fills as the user scrolls.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementImageCompare" },
      note: "Before/after image slider — drag handle reveals two images side-by-side.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementTooltip" },
      note: "Hover/tap tooltip — small popover on interaction with a trigger element.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementDrag" },
      note: "Draggable element — content the user can drag around the screen. Niche.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementInput" },
      note: "Text input field — single-line text entry. Use inside formBlock or standalone.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementRange" },
      note: "Range slider input — numeric slider control.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementFormField" },
      note: "Full form field with label + input — structured form layouts.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementVideoQualitySelect" },
      note: "Video quality selector — dropdown for HLS stream quality levels.",
    },
    {
      tool: "mcp__peblor__explain_element_type",
      params: { type: "elementVideoTime" },
      note: "Video time display — current time / duration readout.",
    },
    // Background types
    {
      tool: "mcp__peblor__explain_bg_type",
      params: { type: "backgroundVariable" },
      note: "Multi-layer gradient/color background — the primary type for stolen pages. layers[] supports fill, motion.",
    },
    {
      tool: "mcp__peblor__explain_bg_type",
      params: { type: "backgroundImage" },
      note: "Static raster image as the full-page background.",
    },
    {
      tool: "mcp__peblor__explain_bg_type",
      params: { type: "backgroundVideo" },
      note: "Full-page video background — autoplay looping video behind the hero.",
    },
    {
      tool: "mcp__peblor__explain_bg_type",
      params: { type: "backgroundPattern" },
      note: "Repeating tiled image pattern — dot grids, diagonal lines, noise textures.",
    },
    {
      tool: "mcp__peblor__explain_bg_type",
      params: { type: "backgroundTransition" },
      note: "Animated crossfade between two backgrounds — scroll-driven or time-driven.",
    },
    // Action types
    {
      tool: "mcp__peblor__list_action_types",
      note: [
        "Returns every action type with its payload shape. Read the full list.",
        "Quick reference for the most common stolen-page actions:",
        "  navigate          { href, replace? }",
        "  openExternalUrl   { url, target? }",
        "  back              (no payload)",
        "  scrollTo          { id, offset?, behavior?, block? }",
        "  scrollLock/Unlock (no payload)",
        "  modalOpen/Close/Toggle { id }",
        "  setVariable       { key, value }",
        "  toggleVariable    { key, values: [a,b] }",
        "  elementShow/Hide/Toggle { id }",
        "  focusElement/blurElement { id }",
        "  setInputValue     { id, value }",
        "  assetPlay/Pause/TogglePlay/Seek/Mute { id? }",
        "  showToast         { message, variant?, durationMs? }",
        "  copyToClipboard   { text }",
        "  trackEvent        { event, properties? }",
        "  setTheme          { mode: 'light'|'dark'|'toggle' }",
        "  setCssVariable    { property, value, selector? }",
        "  contentOverride   { key, value }",
        "  fireMultiple      { actions[], mode, delayBetween?, breakIf? }",
        "  conditionalAction — fire different actions based on a runtime condition",
        "  backgroundSwitch  { id }",
      ].join("\n"),
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "fetchApi" },
      note: "HTTP request for form submission / newsletter signup — complex payload.",
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "fireMultiple" },
      note: "Compose multiple actions — payload: { actions[], mode: 'parallel'|'sequence' }.",
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "conditionalAction" },
      note: "Conditional logic — fire different actions based on a runtime condition.",
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "waitFor" },
      note: "Async wait until a variable condition is met.",
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "computeVariable" },
      note: "Derived variable computation — math, string transforms, conditional assignment.",
    },
    {
      tool: "mcp__peblor__explain_action_type",
      params: { type: "backgroundSwitch" },
      note: "Switch active background definition.",
    },
    // Modules
    {
      label: "modules-if-needed",
      tool: "mcp__peblor__list_modules",
      note: "If the page has video sections → also call explain_module_type for the relevant video-player variant. If it has audio → explain the relevant audio-player variant. Run these in the same parallel batch.",
    },
    {
      tool: "mcp__peblor__list_presets",
      note: "Call ONLY to verify a specific preset exists before using it. Do NOT browse for defaults. Do NOT use typography presets.",
    },
  ];
}
