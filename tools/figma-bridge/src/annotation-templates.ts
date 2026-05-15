import type { InspectableNode } from "./inspect-types";

export interface AnnotationTemplate {
  scope: "element" | "section";
  key: string;
  description: string;
  example: string;
  snippet: string;
}

const FRAME_LIKE = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION", "GROUP"]);

function toAnnotationSnippet(annotation: Record<string, string>): string {
  const pairs = Object.keys(annotation)
    .sort()
    .map((key) => `${key}=${annotation[key]}`);
  return `[pb: ${pairs.join(", ")}]`;
}

function template(
  scope: AnnotationTemplate["scope"],
  key: string,
  example: string,
  description: string
): AnnotationTemplate {
  return { scope, key, example, description, snippet: toAnnotationSnippet({ [key]: example }) };
}

const ELEMENT_ANNOTATION_TEMPLATES: AnnotationTemplate[] = [
  template("element", "type", "button", "Force output element type"),
  template("element", "label", "Learn more", "Button/link label override"),
  template("element", "href", "/about", "Navigation path"),
  template("element", "action", "modalOpen:contact", "Trigger action payload"),
  template("element", "variant", "primary", "Visual variant token"),
  template("element", "size", "lg", "Visual size token"),
  template("element", "disabled", "true", "Disable interactions"),
  template("element", "module", "featureCard", "Bind to module key"),
  template("element", "src", "cdn/hero.mp4", "Media source override"),
  template("element", "poster", "cdn/hero-poster.jpg", "Video poster source"),
  template("element", "autoplay", "true", "Video autoplay"),
  template("element", "loop", "true", "Video loop"),
  template("element", "muted", "true", "Video muted"),
  template("element", "showplaybutton", "true", "Show play control"),
  template("element", "objectfit", "cover", "Image/video fit mode"),
  template("element", "objectposition", "center center", "Image/video focal point"),
  template("element", "seo", "h1", "Semantic heading tag for text"),
  template("element", "style", "body1", "Text style token"),
  template("element", "variablekey", "heroTitle", "Variable/content key"),
  template("element", "contentkey", "ctaText", "Content binding key"),
  template("element", "hidden", "true", "Hide element initially"),
  template("element", "opacity", "0.8", "Opacity override"),
  template("element", "blendmode", "multiply", "Blend mode override"),
  template("element", "overflow", "hidden", "Overflow behavior"),
  template("element", "fliph", "true", "Horizontal flip"),
  template("element", "flipv", "true", "Vertical flip"),
  template("element", "arialabel", "Primary CTA", "ARIA label"),
  template("element", "ariarole", "button", "ARIA role"),
  template("element", "ariahidden", "true", "ARIA hidden"),
  template("element", "zindex", "10", "Layer stacking"),
  template("element", "visiblewhen", "videoPlaying", "Conditional visibility"),
  template("element", "cursor", "pointer", "Cursor style"),
  template("element", "hardswap", "true", "Hard swap behavior"),
  template("element", "entrance", "fadeUp", "Motion entrance preset"),
  template("element", "exit", "fadeOut", "Motion exit preset"),
  template("element", "trigger", "inView", "Motion trigger"),
  template("element", "duration", "0.35", "Motion duration"),
  template("element", "delay", "0.1", "Motion delay"),
  template("element", "ease", "easeOut", "Motion easing"),
  template("element", "stiffness", "220", "Spring stiffness"),
  template("element", "damping", "24", "Spring damping"),
  template("element", "viewportamount", "0.35", "In-view threshold"),
  template("element", "onclick", "elementShow:target-id", "Pointer click trigger action"),
  template("element", "onhoverenter", "elementShow:target-id", "Hover enter trigger"),
  template("element", "onhoverleave", "elementHide:target-id", "Hover leave trigger"),
  template("element", "onpointerdown", "elementShow:target-id", "Pointer down trigger"),
  template("element", "onpointerup", "elementHide:target-id", "Pointer up trigger"),
  template("element", "ondoubleclick", "navigate:/next", "Double-click trigger"),
  template("element", "ondragend", "elementToggle:target-id", "Drag-end trigger"),
];

const SECTION_ANNOTATION_TEMPLATES: AnnotationTemplate[] = [
  template("section", "type", "sectionColumn", "Force section block type"),
  template(
    "section",
    "type",
    "scrollContainer",
    "Force scroll container (usually inferred from overflow)"
  ),
  template(
    "section",
    "type",
    "formBlock",
    "Force form section (usually inferred from input instances)"
  ),
  template("section", "fill", "#111111", "Section fill override"),
  template("section", "overflow", "hidden", "Section overflow override"),
  template("section", "hidden", "true", "Hide section initially"),
  template("section", "onscrolldown", "elementShow:target-id", "Scroll down action"),
  template("section", "onscrollup", "elementHide:target-id", "Scroll up action"),
  template("section", "sticky", "true", "Enable sticky behavior"),
  template("section", "stickyoffset", "24", "Sticky offset"),
  template("section", "stickyposition", "top", "Sticky pin position"),
  template(
    "section",
    "visiblewhen",
    "videoPlaying:equals:true",
    "Conditional visibility (variable:operator:value)"
  ),
  template(
    "section",
    "scrollopacity",
    "0:1:0.2:1",
    "Scroll opacity inputStart:inputEnd:outputStart:outputEnd (colon) or four comma numbers"
  ),
  template("section", "triggeronce", "true", "Fire trigger once"),
  template("section", "threshold", "0.35", "Viewport threshold"),
  template("section", "rootmargin", "0px 0px -10% 0px", "Viewport root margin"),
  template("section", "delay", "120", "Trigger delay in ms"),
  template("section", "arialabel", "Hero section", "Section ARIA label"),
  template("section", "onvisible", "elementShow:target-id", "On visible action"),
  template("section", "oninvisible", "elementHide:target-id", "On invisible action"),
  template("section", "scrollspeed", "0.6", "Parallax speed"),
  template("section", "triggermode", "click", "Reveal trigger mode"),
  template("section", "expandaxis", "vertical", "Reveal expansion axis"),
  template("section", "initialrevealed", "false", "Initial reveal state"),
  template("section", "revealpreset", "fadeUp", "Reveal animation preset"),
  template("section", "expanddurationms", "280", "Reveal duration"),
  template("section", "externaltriggerkey", "hero-cta", "External reveal trigger key"),
  template("section", "timer1", "elementShow:target-id", "Timer action sequence"),
  template("section", "timerinterval1", "1200", "Timer interval in ms"),
  template("section", "key1", "elementToggle:target-id", "Keyboard shortcut action"),
  template("section", "idle1", "elementHide:target-id", "Idle timeout action"),
  template("section", "cursor1", "elementShow:target-id", "Cursor event action"),
  template("section", "effect1", "backgroundBlur:8", "Effect action template"),
];

function getAnnotationTemplatesForNode(nodeType: string): AnnotationTemplate[] {
  const templates: AnnotationTemplate[] = [...ELEMENT_ANNOTATION_TEMPLATES];
  if (FRAME_LIKE.has(nodeType.toUpperCase())) {
    templates.push(...SECTION_ANNOTATION_TEMPLATES);
  }
  return templates;
}

function scoreAnnotationTemplate(node: InspectableNode, t: AnnotationTemplate): number {
  let score = 0;
  const nodeType = node.type.toUpperCase();
  const name = node.name.toLowerCase();
  const isFrameLike = FRAME_LIKE.has(nodeType);
  const isText = nodeType === "TEXT";
  const isVectorLike = nodeType === "RECTANGLE" || nodeType === "ELLIPSE" || nodeType === "VECTOR";

  if (t.scope === "section") {
    if (!isFrameLike) return -100;
    score += 8;
  } else {
    score += isFrameLike ? 2 : 6;
  }

  if (isText) {
    if (t.key === "seo" || t.key === "style") score += 25;
    if (t.key === "contentkey" || t.key === "variablekey") score += 12;
    if (t.key.startsWith("on")) score += 4;
  }

  if (isFrameLike) {
    if (t.scope === "section" && t.key === "type") score += 20;
    if (t.scope === "section" && (t.key === "onvisible" || t.key === "oninvisible")) score += 10;
    if (t.scope === "section" && (t.key === "overflow" || t.key === "hidden")) score += 8;
    if (node.childCount >= 3 && t.key === "type" && t.example === "sectionColumn") score += 20;
    if (node.childCount >= 8 && (t.key === "scrollspeed" || t.key === "sticky")) score += 9;
  }

  if (isVectorLike) {
    if (t.key === "objectfit" || t.key === "objectposition") score += 14;
    if (t.key === "src") score += 10;
  }

  if (name.includes("video")) {
    if (t.key === "src" || t.key === "poster") score += 20;
    if (t.key === "autoplay" || t.key === "loop" || t.key === "muted") score += 16;
    if (t.key === "showplaybutton") score += 12;
  }

  if (name.includes("button") || name.includes("cta")) {
    if (t.key === "type" && t.example === "button") score += 20;
    if (t.key === "label" || t.key === "href" || t.key === "action") score += 16;
    if (t.key === "variant" || t.key === "size" || t.key === "disabled") score += 10;
    if (t.key === "onclick") score += 12;
  }

  if (name.includes("modal")) {
    if (t.key === "action" && t.example.startsWith("modalOpen:")) score += 16;
  }

  if (name.includes("hero") && t.key === "seo" && t.example === "h1") {
    score += 12;
  }

  return score;
}

export function getAnnotationTemplateTotal(nodeType: string): number {
  return getAnnotationTemplatesForNode(nodeType).length;
}

export function getTopAnnotationTemplates(
  node: InspectableNode,
  limit: number
): AnnotationTemplate[] {
  const candidates = getAnnotationTemplatesForNode(node.type);
  const ranked = candidates
    .map((template) => ({ template, score: scoreAnnotationTemplate(node, template) }))
    .filter((entry) => entry.score > -50)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.template.scope !== b.template.scope)
        return a.template.scope.localeCompare(b.template.scope);
      return a.template.key.localeCompare(b.template.key);
    });
  return ranked.slice(0, limit).map((entry) => entry.template);
}

/**
 * Returns all annotation templates, optionally filtered by scope.
 * Useful for reference panels that display the full key catalogue.
 */
export function getAllAnnotationTemplates(
  scope?: "element" | "section" | "all"
): AnnotationTemplate[] {
  if (scope === "element") return [...ELEMENT_ANNOTATION_TEMPLATES];
  if (scope === "section") return [...SECTION_ANNOTATION_TEMPLATES];
  return [...ELEMENT_ANNOTATION_TEMPLATES, ...SECTION_ANNOTATION_TEMPLATES];
}
