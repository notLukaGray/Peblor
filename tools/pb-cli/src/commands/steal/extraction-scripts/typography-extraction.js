() => {
  function detail(el) {
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    // Convert px letter-spacing to em for portability
    const lsPx = parseFloat(cs.letterSpacing);
    const fsPx = parseFloat(cs.fontSize);
    const lsEm = !isNaN(lsPx) && !isNaN(fsPx) && fsPx > 0 ? (lsPx / fsPx).toFixed(4) + "em" : null;
    return {
      fontFamily: cs.fontFamily,
      fontFamilyPrimary: cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      lineHeightUnitless:
        !isNaN(parseFloat(cs.lineHeight)) &&
        !isNaN(parseFloat(cs.fontSize)) &&
        parseFloat(cs.fontSize) > 0
          ? (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(3)
          : null,
      letterSpacing: cs.letterSpacing !== "0px" ? cs.letterSpacing : null,
      letterSpacingEm: lsPx !== 0 && lsEm ? lsEm : null,
      textTransform: cs.textTransform !== "none" ? cs.textTransform : null,
      textDecoration: cs.textDecorationLine !== "none" ? cs.textDecorationLine : null,
      fontStyle: cs.fontStyle !== "normal" ? cs.fontStyle : null,
      fontVariantNumeric: cs.fontVariantNumeric !== "normal" ? cs.fontVariantNumeric : null,
      color: cs.color,
      opacity: cs.opacity !== "1" ? cs.opacity : null,
    };
  }
  const out = {};
  ["h1", "h2", "h3", "h4", "h5", "h6", "p", "button", "a", "li", "span", "label"].forEach((tag) => {
    const el = document.querySelector(tag);
    if (el) out[tag] = detail(el);
  });

  const h2Samples = Array.from(document.querySelectorAll("h2"))
    .slice(0, 5)
    .map((el) => detail(el));
  const h3Samples = Array.from(document.querySelectorAll("h3"))
    .slice(0, 4)
    .map((el) => detail(el));
  const pSamples = Array.from(document.querySelectorAll("p"))
    .slice(0, 6)
    .map((el) => detail(el));

  // ── All unique heading style profiles (detect display vs section vs label sizes) ──
  // Exclude embedded interactive widgets (live demo panels, issue trackers, etc.) —
  // their internal UI chrome uses its OWN type scale (often heavier weights like 590)
  // that has nothing to do with the page's actual marketing-copy heading styles, and
  // sampling it pollutes the scale the AI builds in pass3-typography.json (e.g. a
  // widget's "Faster app launch" h3 at weight 590 getting mistaken for the page's
  // genuine section/label scale, which is actually weight 510/400). Mirrors the same
  // iframe/[role='application'] exclusion findPageButtons() already applies below.
  const allHeadingProfiles = [];
  const seenProfiles = new Set();
  Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter(
      (h) =>
        h.getBoundingClientRect().height > 0 &&
        !h.closest("iframe") &&
        !h.closest("[role='application']")
    )
    .forEach((h) => {
      const cs = window.getComputedStyle(h);
      const key = h.tagName.toLowerCase() + "-" + cs.fontSize + "-" + cs.fontWeight;
      if (!seenProfiles.has(key)) {
        seenProfiles.add(key);
        allHeadingProfiles.push({
          tag: h.tagName.toLowerCase(),
          text: (h.textContent || "").trim().slice(0, 80),
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing !== "0px" ? cs.letterSpacing : null,
          lineHeight: cs.lineHeight,
          color: cs.color,
          opacity: cs.opacity,
          y: Math.round(h.getBoundingClientRect().top + window.scrollY),
        });
      }
    });

  // ── Small label/chip elements: typically small, uppercase or wide-tracked spans ──
  const labelProfiles = Array.from(document.querySelectorAll("span,p,div,label"))
    .filter((el) => {
      const cs = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const fsNum = parseFloat(cs.fontSize);
      const lsNum = parseFloat(cs.letterSpacing);
      return (
        r.height > 0 &&
        fsNum < 14 &&
        (cs.textTransform === "uppercase" ||
          lsNum > 0.5 ||
          cs.fontWeight === "500" ||
          cs.fontWeight === "600")
      );
    })
    .slice(0, 4)
    .map((el) => detail(el));

  // ── Feature-section labels: e.g. "1.0 Intake →" — these are a DISTINCT semantic
  // class from the small uppercase chips above (they sit beside feature-section
  // headings, often as links, and their fontSize commonly overlaps body-text size
  // ~14-18px — a bare size threshold would either miss them or false-positive on
  // body paragraphs). Match by TEXT PATTERN instead: a leading number (optionally
  // dotted, e.g. "1.0"/"1") followed by a trailing arrow glyph. This is what was
  // missing — without it, the AI never sees this class's true (often lighter, e.g.
  // regular/400) weight and has to guess, typically snapping to a heavier "safe"
  // value that doesn't match the source.
  const sectionLabelProfiles = Array.from(document.querySelectorAll("a,span,p,div,label"))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const t = (el.textContent || "").trim();
      return r.height > 0 && r.height < 80 && /^\d+(\.\d+)?\b.*[→➔➜>]\s*$/.test(t);
    })
    .slice(0, 4)
    .map((el) => detail(el));

  const textColors = new Set();
  document.querySelectorAll("h1,h2,h3,h4,p,a,span,button,li").forEach((el) => {
    const c = window.getComputedStyle(el).color;
    if (c && c !== "rgba(0, 0, 0, 0)") textColors.add(c);
  });

  const bgColors = new Set();
  document.querySelectorAll("section,article,div,[role='region']").forEach((el) => {
    const c = window.getComputedStyle(el).backgroundColor;
    if (c && c !== "rgba(0, 0, 0, 0)") bgColors.add(c);
  });

  // ── Button detection: use CTA text patterns FIRST, CSS class selectors second. ──
  // CSS substring selectors like [class*="primary"] match embedded app buttons on SPA pages.
  // Text patterns ("Sign up", "Get started") are far more reliable for page-level CTAs.
  function findPageButtons(sel) {
    const ctaPrimary = [
      "Sign up",
      "Get started",
      "Start free",
      "Try free",
      "Request demo",
      "Get early access",
      "Join waitlist",
    ];
    const ctaGhost = [
      "Log in",
      "Sign in",
      "Contact sales",
      "Talk to sales",
      "Learn more",
      "See pricing",
      "Watch demo",
    ];
    const isGhost = sel.includes("ghost") || sel.includes("secondary") || sel.includes("outline");
    const ctaTexts = isGhost ? ctaGhost : ctaPrimary;
    // Priority 1: CTA text patterns in page chrome (header, nav, footer, top of main)
    const containers = document.querySelectorAll(
      "header, nav, [role='banner'], footer, [role='contentinfo'], main > *"
    );
    for (const c of containers) {
      if (c.closest("iframe") || c.closest("[role='application']")) continue;
      const btns = c.querySelectorAll("a[href], button");
      for (const btn of btns) {
        if (btn.closest("iframe") || btn.closest("[role='application']")) continue;
        const t = (btn.textContent || "").trim();
        if (ctaTexts.some((cta) => t.toLowerCase().includes(cta.toLowerCase()))) {
          return btn;
        }
      }
    }
    // Priority 2: CSS class selector, but only in page chrome, not in embedded apps
    for (const c of containers) {
      if (c.closest("iframe") || c.closest("[role='application']")) continue;
      const btn = c.querySelector(sel);
      if (btn && !btn.closest("iframe") && !btn.closest("[role='application']")) return btn;
    }
    return null;
  }

  const primaryBtn = findPageButtons('[class*="primary"],[class*="signup"],[class*="cta"]');
  const ghostBtn = findPageButtons('[class*="ghost"],[class*="secondary"],[class*="outline"]');

  return JSON.stringify({
    elements: out,
    h2Samples,
    h3Samples,
    pSamples,
    allHeadingProfiles,
    labelProfiles,
    sectionLabelProfiles,
    distinctTextColors: Array.from(textColors).slice(0, 14),
    distinctBgColors: Array.from(bgColors).slice(0, 12),
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    primaryButton: primaryBtn
      ? {
          text: primaryBtn.textContent?.trim().slice(0, 40),
          color: window.getComputedStyle(primaryBtn).color,
          backgroundColor: window.getComputedStyle(primaryBtn).backgroundColor,
          border: window.getComputedStyle(primaryBtn).border,
          borderRadius: window.getComputedStyle(primaryBtn).borderRadius,
          padding: window.getComputedStyle(primaryBtn).padding,
          fontSize: window.getComputedStyle(primaryBtn).fontSize,
          fontWeight: window.getComputedStyle(primaryBtn).fontWeight,
          boxShadow:
            window.getComputedStyle(primaryBtn).boxShadow !== "none"
              ? window.getComputedStyle(primaryBtn).boxShadow
              : null,
        }
      : null,
    ghostButton: ghostBtn
      ? {
          text: ghostBtn.textContent?.trim().slice(0, 40),
          color: window.getComputedStyle(ghostBtn).color,
          backgroundColor: window.getComputedStyle(ghostBtn).backgroundColor,
          border: window.getComputedStyle(ghostBtn).border,
          borderRadius: window.getComputedStyle(ghostBtn).borderRadius,
          padding: window.getComputedStyle(ghostBtn).padding,
        }
      : null,
  });
};
