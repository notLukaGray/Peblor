() => {
  function truncate(s, n) {
    return s ? s.trim().slice(0, n) : "";
  }

  function getBestImgSrc(img, displayW) {
    if (img.srcset) {
      const candidates = img.srcset
        .split(",")
        .map((s) => {
          const parts = s.trim().split(/\s+/);
          const descriptor = parts[1] || "";
          const isDensity = /x$/i.test(descriptor);
          const value = parseFloat(descriptor) || 0;
          return { url: parts[0], value, isDensity };
        })
        .filter((c) => c.url && !c.url.startsWith("data:"));
      if (candidates.length > 0) {
        // Prefer the smallest candidate that still covers a 2x-retina render at the
        // image's actual displayed width. Blindly grabbing the largest srcset entry
        // (the old behavior) downloads grossly oversized assets — e.g. a hero shown
        // at 1024px display width but downloaded at 7584px because the source site
        // also lists a 5x/8K variant intended for some unrelated layout context.
        const pickSmallestAtLeast = (list, target) => {
          const sorted = [...list].sort((a, b) => a.value - b.value);
          return (sorted.find((c) => c.value >= target) || sorted[sorted.length - 1]).url;
        };
        const widthCandidates = candidates.filter((c) => !c.isDensity);
        const densityCandidates = candidates.filter((c) => c.isDensity);
        if (widthCandidates.length > 0 && displayW > 0) {
          return pickSmallestAtLeast(widthCandidates, displayW * 2);
        }
        if (densityCandidates.length > 0) {
          return pickSmallestAtLeast(densityCandidates, 2);
        }
        return [...candidates].sort((a, b) => b.value - a.value)[0].url;
      }
    }
    return (
      img.currentSrc ||
      img.src ||
      img.dataset.src ||
      img.dataset.lazySrc ||
      img.dataset.original ||
      img.getAttribute("data-lazy") ||
      ""
    );
  }

  function closestHref(el) {
    const a = el.closest("a");
    return a ? a.getAttribute("href") || null : null;
  }

  // ── THIRD-PARTY WIDGET DETECTION ──────────────────────────────────────────
  // Chat launchers (Intercom/Drift/Crisp/Zendesk/Tawk), cookie-consent banners
  // (OneTrust/Cookiebot/Osano), and analytics overlays inject DOM as siblings of
  // <body> or deep inside opaque "portal" wrapper divs — NOT as <iframe>s — so the
  // iframe/role checks above miss them entirely. Two independent signal families,
  // either of which is enough on its own (naming is near-unambiguous; geometry
  // needs corroboration to avoid flagging a legitimate fixed header/CTA bar):
  //
  //   (a) NAMING — id/class/data-attribute substrings that real third-party widget
  //       vendors hardcode into their injected markup (near-zero false-positive
  //       rate: no marketing site names its own hero "intercom-launcher").
  //   (b) GEOMETRY — position:fixed/sticky + high z-index + small footprint + pinned
  //       to a screen edge/corner with a visible gap. A fixed *header/nav/CTA bar*
  //       (legitimate site chrome) spans ~full width (top/bottom bars) or ~full
  //       height (side rails) of the edge it's attached to — a floating widget
  //       bubble/banner is small in BOTH viewport dimensions and sits with a margin
  //       off the edge(s) it hugs. The "spans full width/height" check is what keeps
  //       real chrome out: it's what makes a vertical-edge proximity check meaningful
  //       (a full-width bar's left edge is trivially "near" x=0 — that's a byproduct
  //       of spanning the page, not evidence of being corner-pinned).
  const WIDGET_NAME_RE =
    /(intercom|drift|crisp|zendesk|tawk|hubspot[-_]?(messages|chat|widget)?|freshchat|freshworks|olark|livechat|tidio|gorgias|messenger[-_]?bubble|chat[-_]?(widget|launcher|bubble)|cookie[-_]?(consent|banner|notice|bar|policy)|consent[-_]?(manager|banner|modal)|cookiebot|onetrust|osano|trustarc|usercentrics|gdpr[-_]?(banner|consent|notice)|klaro)/i;

  function hasWidgetNameSignal(el) {
    const id = (el.id || "").toLowerCase();
    if (WIDGET_NAME_RE.test(id)) return true;
    const className = (
      typeof el.className === "string" ? el.className : el.getAttribute("class") || ""
    ).toLowerCase();
    if (WIDGET_NAME_RE.test(className)) return true;
    for (const attr of Array.from(el.attributes || [])) {
      if (
        /^(data-|aria-)/.test(attr.name) &&
        WIDGET_NAME_RE.test(attr.name + "=" + (attr.value || ""))
      )
        return true;
    }
    return false;
  }

  function looksLikeFloatingWidget(el) {
    const cs = window.getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") return false;
    const z = cs.zIndex === "auto" ? 0 : parseInt(cs.zIndex, 10) || 0;
    if (z < 1000) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    // Small footprint in BOTH axes — a chat bubble or banner, not a full chrome bar.
    const smallFootprint = r.width < window.innerWidth * 0.6 && r.height < window.innerHeight * 0.6;
    if (!smallFootprint) return false;

    const edgeMargin = 24;
    const nearTop = r.top <= edgeMargin;
    const nearBottom = window.innerHeight - r.bottom <= edgeMargin;
    const nearLeft = r.left <= edgeMargin;
    const nearRight = window.innerWidth - r.right <= edgeMargin;

    // The shape — not just the edge proximity — is what separates real chrome from
    // a floating overlay, because a full-bleed bar's outer edges are TRIVIALLY flush
    // with the viewport edges it spans (that's what "full-width" means). What chrome
    // never does is be simultaneously narrow-and-short: a header/footer bar is narrow
    // in height but spans the full width; a side rail is narrow in width but spans
    // the full height. Only floating overlays (bubbles, short banners, corner toasts)
    // are meaningfully smaller than the viewport in BOTH axes AND sit near an edge.
    const narrowWidth = r.width < window.innerWidth * 0.6;
    const shortHeight = r.height < window.innerHeight * 0.6;

    // Horizontal banner/strip: hugs the top or bottom edge AND doesn't run edge-to-edge
    // horizontally (narrow width) — a "we use cookies" strip or announcement toast,
    // as distinct from a full-bleed sticky header/footer/CTA bar.
    const bannerPinned = (nearTop || nearBottom) && narrowWidth;
    // Vertical rail/widget: hugs the left or right edge AND doesn't run edge-to-edge
    // vertically (short height) — a side-docked chat tab, as distinct from a full-height
    // sidebar that's part of the page's own layout.
    const railPinned = (nearLeft || nearRight) && shortHeight;
    // Corner bubble: small in both axes, sitting where a horizontal and a vertical
    // edge meet (the canonical chat-launcher position).
    const cornerPinned =
      (nearTop || nearBottom) && (nearLeft || nearRight) && narrowWidth && shortHeight;

    return bannerPinned || railPinned || cornerPinned;
  }

  function isThirdPartyWidget(el) {
    let node = el;
    let depth = 0;
    while (node && node !== document.body && depth < 10) {
      if (hasWidgetNameSignal(node)) return true;
      if (looksLikeFloatingWidget(node)) return true;
      node = node.parentElement;
      depth++;
    }
    return false;
  }

  function isInEmbeddedApp(el) {
    return (
      el.closest('[role="application"]') !== null ||
      el.closest('[role="grid"]') !== null ||
      el.closest("iframe") !== null ||
      isThirdPartyWidget(el)
    );
  }

  // ── STRUCTURAL SECTION FINDER (DOM-shape + semantics + visual breaks) ─────
  // SPAs that flatten everything into 1-2 giant wrapper divs still group their
  // visual sections as DOM siblings somewhere a few levels down — virtualization
  // collapses *box* structure into one scroll container, but the section divs
  // themselves are still real elements with real bounding boxes. Walk down level
  // by level looking for the shallowest layer where several siblings each look
  // "section-shaped". A sibling looks section-shaped if it clears a *baseline*
  // geometric bar (full-width-ish, visible) AND carries at least one corroborating
  // signal so a row of equal-height marketing cards doesn't get mistaken for the
  // top-level section list:
  //   • semantic landmark   — <section>/<article>/[role=region|article]/[id]/[data-section*]
  //   • visual break        — background-color genuinely differs from its neighbor,
  //                           or there's a large vertical gap before it (a divider/whitespace
  //                           seam — the same cue a human eye uses to spot a new section)
  //   • repetition pattern  — its normalized class-name "shape" recurs across siblings,
  //                           which is exactly how component-based SPAs stamp out sections
  //   • real height         — tall enough (>= 150px) to plausibly be a whole section, not
  //                           a card/row inside one
  // This is far more robust than slicing by heading y-position: it doesn't care
  // whether a section has zero, one, or five headings, or whether headings cluster
  // (eyebrow + H2 + sub-h3) or appear out of visual order under absolute positioning.
  function classShape(el) {
    // Normalize a class list into a comparable "shape": strip hashes/numbers that
    // CSS-in-JS and CSS-modules tooling append (e.g. "Hero_root__a1b2c" -> "hero_root__"),
    // so structurally-identical siblings compare equal even with per-instance suffixes.
    const raw = (el.getAttribute("class") || "").trim();
    if (!raw) return "";
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map((c) => c.replace(/[0-9a-f]{4,}/g, "").replace(/[-_][0-9]+$/g, ""))
      .sort()
      .join(" ");
  }

  function looksLikeVisualBreak(el, prevEl) {
    if (!prevEl) return true; // first candidate always starts a new section
    const cs = window.getComputedStyle(el);
    const prevCs = window.getComputedStyle(prevEl);
    if (
      cs.backgroundColor !== prevCs.backgroundColor &&
      cs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
      prevCs.backgroundColor !== "rgba(0, 0, 0, 0)"
    ) {
      return true;
    }
    const r = el.getBoundingClientRect();
    const prevR = prevEl.getBoundingClientRect();
    const gap = r.top - prevR.bottom;
    // A gap wider than ~6% of the viewport height reads as a deliberate seam
    // between sections rather than ordinary internal spacing.
    if (gap > window.innerHeight * 0.06) return true;
    return false;
  }

  function isSemanticLandmark(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    return (
      tag === "section" ||
      tag === "article" ||
      role === "region" ||
      role === "article" ||
      !!el.id ||
      !!el.getAttribute("data-section") ||
      Array.from(el.attributes).some((a) => /^data-(section|testid|component|block)/.test(a.name))
    );
  }

  function findStructuralSections(root) {
    let level = [root];
    for (let depth = 0; depth < 8 && level.length > 0; depth++) {
      const children = level.flatMap((el) =>
        Array.from(el.children).filter((c) => !isInEmbeddedApp(c))
      );
      if (children.length === 0) break;

      const baseline = children.filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return (
          r.height >= 150 &&
          r.width >= window.innerWidth * 0.5 &&
          cs.display !== "none" &&
          cs.visibility !== "hidden"
        );
      });

      // Build a class-shape histogram across this level so we can tell whether a
      // given sibling's wrapper pattern repeats — the fingerprint of stamped-out
      // SPA section components (e.g. every section is a <div class="Section_root__xy">).
      const shapeCounts = new Map();
      for (const el of baseline) {
        const shape = classShape(el);
        if (shape) shapeCounts.set(shape, (shapeCounts.get(shape) || 0) + 1);
      }

      const corroborated = baseline.filter((el, i) => {
        if (isSemanticLandmark(el)) return true;
        const shape = classShape(el);
        if (shape && (shapeCounts.get(shape) || 0) >= 2) return true;
        if (looksLikeVisualBreak(el, baseline[i - 1])) return true;
        return false;
      });

      // Prefer the corroborated set (signals beyond raw geometry agree these are
      // real section boundaries); fall back to pure geometry only if corroboration
      // doesn't produce enough candidates to call it a section list.
      const sectionShaped = corroborated.length >= 3 ? corroborated : baseline;

      if (sectionShaped.length >= 3) {
        const top = sectionShaped.filter(
          (el, i) =>
            !sectionShaped.some((other, j) => j !== i && other.contains(el) && other !== el)
        );
        if (top.length >= 3) return top;
      }
      // Keep descending through whichever subtree actually has section-shaped content;
      // fall back to all children if nothing at this level qualified yet.
      level = sectionShaped.length > 0 ? sectionShaped : children;
    }
    return null;
  }

  function sectionSummary(el) {
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || rect.height < 20) return null;

    const isRow = cs.display === "flex" && cs.flexDirection === "row";
    const isGrid = cs.display === "grid";

    const imgs = Array.from(el.querySelectorAll("img"));
    const svgImgs = imgs.filter((img) =>
      (img.getAttribute("src") || "").toLowerCase().includes(".svg")
    );
    const smallImgs = imgs.filter((img) => {
      const r = img.getBoundingClientRect();
      return r.height > 0 && r.height < 70 && r.width < 220;
    });
    const isLogoBar = svgImgs.length >= 3 || (smallImgs.length >= 4 && imgs.length >= 4);

    let textSide = null,
      imageSide = null;
    if (isRow && el.children.length === 2) {
      const [left, right] = el.children;
      const lHasText = left.querySelector("h1,h2,h3,h4,h5,h6,p") !== null;
      const rHasText = right.querySelector("h1,h2,h3,h4,h5,h6,p") !== null;
      const lHasImg = left.querySelector("img,svg,video") !== null;
      const rHasImg = right.querySelector("img,svg,video") !== null;
      if (lHasText && rHasImg) {
        textSide = "left";
        imageSide = "right";
      }
      if (lHasImg && rHasText) {
        textSide = "right";
        imageSide = "left";
      }
    }

    const contentLinks = Array.from(el.querySelectorAll("a[href]"))
      .filter((a) => {
        const text = a.textContent?.trim() || "";
        return text.length > 20 && a.querySelector("p,h1,h2,h3,h4,h5,h6,span");
      })
      .slice(0, 8)
      .map((a) => ({
        href: a.getAttribute("href"),
        headingText: truncate(a.querySelector("h1,h2,h3,h4,h5,h6")?.textContent || "", 100),
        bodyText: truncate(a.querySelector("p")?.textContent || a.textContent || "", 150),
        hasDate: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(a.textContent || ""),
      }));

    const quotes = Array.from(
      el.querySelectorAll("blockquote,[class*='quote'],[class*='testimonial']")
    )
      .slice(0, 4)
      .map((q) => {
        const authorEl = q.querySelector("[class*='author'],[class*='name'],cite,strong");
        const companyEl = q.querySelector("[class*='company'],[class*='role'],[class*='title']");
        return {
          quoteText: truncate(
            q.querySelector("p,[class*='text']")?.textContent || q.textContent || "",
            200
          ),
          author: truncate(authorEl?.textContent || "", 60),
          company: truncate(companyEl?.textContent || "", 60),
          href: closestHref(q),
        };
      });

    const labelEl = Array.from(el.querySelectorAll("span,p,div")).find((el) => {
      const t = el.textContent?.trim() || "";
      return /^\d+\.\d+/.test(t) && t.length < 40;
    });
    const sectionLabel = labelEl
      ? { text: truncate(labelEl.textContent || "", 50), href: closestHref(labelEl) }
      : null;

    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") || null,
      id: el.id || null,
      ariaLabel: el.getAttribute("aria-label") || null,
      isRow,
      isGrid,
      isLogoBar,
      textSide,
      imageSide,
      contentLinks,
      quotes,
      sectionLabel,
      padding: {
        top: cs.paddingTop,
        right: cs.paddingRight,
        bottom: cs.paddingBottom,
        left: cs.paddingLeft,
      },
      backgroundColor: cs.backgroundColor,
      backgroundImage: cs.backgroundImage !== "none" ? truncate(cs.backgroundImage, 200) : null,
      gridTemplateColumns: isGrid ? cs.gridTemplateColumns : null,
      gap: cs.gap !== "0px" ? cs.gap : null,
      height: Math.round(rect.height),
      viewportPct: Math.round((rect.height / window.innerHeight) * 100),
      headings: Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6"))
        .filter((h) => !isInEmbeddedApp(h))
        .slice(0, 20)
        .map((h) => ({
          level: parseInt(h.tagName[1]),
          text: truncate(h.textContent, 150),
          href: closestHref(h),
        })),
      paragraphs: Array.from(el.querySelectorAll("p"))
        .filter((p) => !isInEmbeddedApp(p))
        .slice(0, 15)
        .map((p) => ({
          text: truncate(p.textContent, 200),
          href: closestHref(p),
          opacity: window.getComputedStyle(p).opacity,
        })),
      buttons: Array.from(
        el.querySelectorAll('button,a[href][class*="btn"],a[href][class*="button"],[role="button"]')
      )
        .filter((b) => !isInEmbeddedApp(b))
        .slice(0, 4)
        .map((b) => ({
          label: truncate(b.textContent, 80),
          href: b.getAttribute("href") || null,
          backgroundColor: window.getComputedStyle(b).backgroundColor,
          color: window.getComputedStyle(b).color,
          borderRadius: window.getComputedStyle(b).borderRadius,
          padding: window.getComputedStyle(b).padding,
        })),
      images: Array.from(el.querySelectorAll("img"))
        .slice(0, 8)
        .map((img) => {
          const r = img.getBoundingClientRect();
          const cs = window.getComputedStyle(img);
          return {
            src: getBestImgSrc(img, r.width),
            alt: img.alt,
            displayW: Math.round(r.width),
            displayH: Math.round(r.height),
            naturalW: img.naturalWidth,
            naturalH: img.naturalHeight,
            isSvg: (img.getAttribute("src") || "").toLowerCase().includes(".svg"),
            href: closestHref(img),
            opacity: parseFloat(cs.opacity),
            role: classifyImageRole(img),
          };
        })
        .filter((i) => i.src && !i.src.startsWith("data:")),
      svgs: Array.from(el.querySelectorAll("svg"))
        .filter((svg) => {
          const r = svg.getBoundingClientRect();
          return r.width > 40 || r.height > 40;
        })
        .slice(0, 3)
        .map((svg) => {
          // HTML's foreign-content parsing assigns <svg> the SVG namespace implicitly, so
          // outerHTML on an inline node frequently omits xmlns entirely (browsers only echo
          // attributes that were actually written in markup). Standalone .svg files loaded
          // via <img src> are parsed as independent XML documents and REQUIRE the namespace
          // declaration on the root element — without it the browser silently refuses to
          // decode the image (naturalWidth/Height stay 0, <img> renders its broken-image alt
          // fallback). Inject it here, once, so every saved .svg is valid standalone markup.
          let markup = svg.outerHTML;
          if (!/<svg[^>]*sxmlnss*=/.test(markup)) {
            markup = markup.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          return {
            w: Math.round(svg.getBoundingClientRect().width),
            h: Math.round(svg.getBoundingClientRect().height),
            viewBox: svg.getAttribute("viewBox"),
            id: svg.id || null,
            outerHTML: markup.slice(0, 5000),
          };
        }),
      videos: Array.from(el.querySelectorAll("video"))
        .slice(0, 2)
        .map((v) => ({
          src: v.src || v.querySelector("source")?.src || null,
          poster: v.poster || null,
        })),
    };
  }

  const headerEl = document.querySelector("header,[role='banner'],nav:first-of-type");
  const footerEl = document.querySelector("footer,[role='contentinfo']");

  const candidates = Array.from(
    document.querySelectorAll(
      'main section, main article, main > div, [role="region"], [role="main"] > *'
    )
  ).filter((el) => el !== headerEl && el !== footerEl && !isInEmbeddedApp(el));
  const deduped = candidates.filter(
    (el, i) => !candidates.some((other, j) => j !== i && other.contains(el) && other !== el)
  );

  // ── SPA DRILL-DOWN FALLBACK ────────────────────────────────────────────
  // Try the structural finder first — it reads real DOM siblings/boxes, so it
  // gets section boundaries right even when headings are missing, doubled-up,
  // or visually out of order. Only fall back to slicing-by-heading-position
  // (fragile: assumes exactly one h1/h2 marks exactly one section boundary)
  // when the DOM genuinely has no discoverable section-shaped grouping —
  // e.g. a truly flat virtualized list with no real wrapper boxes at all.
  let sections;
  const structuralSections =
    deduped.length <= 2 && deduped[0] && deduped[0].getBoundingClientRect().height > 2000
      ? findStructuralSections(deduped[0])
      : null;

  if (structuralSections) {
    sections = structuralSections
      .slice(0, 20)
      .map((el) => sectionSummary(el))
      .filter(Boolean);
  } else if (
    deduped.length <= 2 &&
    deduped[0] &&
    deduped[0].getBoundingClientRect().height > 2000
  ) {
    // ── LAST-RESORT: slice by "section-leading" heading position ────────────
    // Only reachable when the structural finder above found nothing — e.g. a
    // truly flat virtualized list with no real wrapper boxes at all. Even then,
    // raw h1/h2 y-position is fragile: pages routinely contain decorative or
    // nested headings (a small "eyebrow" label styled as an h2 sitting just above
    // the real H1, a card grid where every card promotes its label to an h2,
    // repeated CTA blocks each with their own heading) that don't actually mark
    // a new section — they're visually subordinate to the section's real title.
    //
    // Section-leading headings are, almost by definition, the *visually dominant*
    // headings *for their tag level* — a design system renders every real "section
    // title" h2 at roughly the same size, so an h2 that's conspicuously smaller than
    // its h2 peers (an eyebrow label, a card title promoted for SEO/a11y reasons,
    // a footer-column heading) is the outlier, not the norm. Compute the median
    // font-size per heading level and drop anything that renders meaningfully
    // smaller than its peers — no DOM-position guessing required, and it survives
    // pages where the hero h1 is intentionally much larger than section h2s.
    function median(nums) {
      if (nums.length === 0) return 0;
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    const rawHeadings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .filter((h) => h.getBoundingClientRect().height > 0 && !isInEmbeddedApp(h))
      .map((h) => {
        const r = h.getBoundingClientRect();
        return {
          el: h,
          y: Math.round(r.top + window.scrollY),
          level: parseInt(h.tagName[1]),
          fontSize: parseFloat(window.getComputedStyle(h).fontSize) || 0,
          text: (h.textContent || "").trim().slice(0, 150),
        };
      })
      .sort((a, b) => a.y - b.y);

    const topLevelHeadings = rawHeadings.filter((h) => h.level <= 2);
    const medianByLevel = new Map();
    for (const level of [1, 2]) {
      medianByLevel.set(
        level,
        median(topLevelHeadings.filter((h) => h.level === level).map((h) => h.fontSize))
      );
    }
    const dominantHeadings = topLevelHeadings.filter((h) => {
      const peerMedian = medianByLevel.get(h.level) || 0;
      // Within ~20% of the peer median (or there's only one of this level, in
      // which case the median check is a no-op and it passes by definition).
      return peerMedian === 0 || h.fontSize >= peerMedian * 0.8;
    });

    // Collapse tight visual clusters (eyebrow immediately above a title, title
    // immediately above a subtitle): when two dominant headings sit within ~8%
    // of viewport height of each other, they're describing the same section seam
    // — keep only the visually-dominant one (larger font-size; ties broken toward
    // the lower heading level, i.e. h1 over h2) as that section's single marker.
    const clusterGap = window.innerHeight * 0.08;
    const headingMarkers = [];
    for (const h of dominantHeadings) {
      const last = headingMarkers[headingMarkers.length - 1];
      if (last && h.y - last.rangeStartY < clusterGap) {
        const better =
          h.fontSize !== last.fontSize
            ? h.fontSize > last.fontSize
              ? h
              : last
            : h.level <= last.level
              ? h
              : last;
        // Keep the cluster's *earliest* y as the section's range start (so the
        // eyebrow above a hero title stays inside that section's content rather
        // than falling just outside the range and getting silently dropped), but
        // keep the visually-dominant heading as the displayed marker/label.
        headingMarkers[headingMarkers.length - 1] = {
          ...better,
          rangeStartY: Math.min(last.rangeStartY, h.y),
        };
      } else {
        headingMarkers.push({ ...h, rangeStartY: h.y });
      }
    }

    // Anything above the first surviving marker (eyebrows/badges/decorative
    // headings that were filtered out as non-dominant, or plain intro copy with
    // no heading at all) is still real page content — fold it into the first
    // section's range rather than silently dropping it at the seam.
    if (headingMarkers.length > 0) headingMarkers[0].rangeStartY = 0;

    function centerY(el) {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2 + window.scrollY;
    }

    const allP = Array.from(document.querySelectorAll("p"))
      .filter((p) => p.getBoundingClientRect().height > 0 && !isInEmbeddedApp(p))
      .map((p) => ({ cy: centerY(p), el: p }));

    const allImg = Array.from(document.querySelectorAll("img"))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return (r.width > 20 || img.naturalWidth > 100) && !isInEmbeddedApp(img);
      })
      .map((img) => ({ cy: centerY(img), el: img }));

    const allBtn = Array.from(
      document.querySelectorAll(
        'button, a[href][class*="btn"], a[href][class*="button"], [role="button"]'
      )
    )
      .filter((b) => !isInEmbeddedApp(b))
      .map((b) => ({ cy: centerY(b), el: b }));

    const allCL = Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => {
        const t = (a.textContent || "").trim();
        return t.length > 20 && a.querySelector("p,h1,h2,h3,h4,h5,h6,span") && !isInEmbeddedApp(a);
      })
      .map((a) => ({ cy: centerY(a), el: a }));

    const allQ = Array.from(
      document.querySelectorAll("blockquote,[class*='quote'],[class*='testimonial']")
    )
      .filter((q) => !isInEmbeddedApp(q))
      .map((q) => ({ cy: centerY(q), el: q }));

    const virtualSections = [];
    for (let i = 0; i < headingMarkers.length; i++) {
      const cur = headingMarkers[i];
      const nxt = headingMarkers[i + 1];
      const rangeTop = cur.rangeStartY;
      const rangeBottom = nxt ? nxt.rangeStartY : document.body.scrollHeight;

      function inRange(item) {
        return item.cy >= rangeTop && item.cy < rangeBottom;
      }

      // Report every heading in range (not just the lead marker) so callers still
      // see eyebrow/sub-heading text — only the *slicing* uses the curated list.
      const secHeadings = rawHeadings
        .filter((h) => h.y >= rangeTop && h.y < rangeBottom)
        .map((h) => ({ level: h.level, text: truncate(h.text, 150), href: closestHref(h.el) }));

      const secParagraphs = allP
        .filter(inRange)
        .slice(0, 8)
        .map((p) => ({
          text: truncate(p.el.textContent, 200),
          href: closestHref(p.el),
          opacity: window.getComputedStyle(p.el).opacity,
        }));

      const secImages = allImg
        .filter(inRange)
        .slice(0, 8)
        .map((img) => {
          const r = img.el.getBoundingClientRect();
          const cs = window.getComputedStyle(img.el);
          return {
            src: getBestImgSrc(img.el, r.width),
            alt: img.el.alt,
            displayW: Math.round(r.width),
            displayH: Math.round(r.height),
            naturalW: img.el.naturalWidth,
            naturalH: img.el.naturalHeight,
            isSvg: (img.el.getAttribute("src") || "").toLowerCase().includes(".svg"),
            href: closestHref(img.el),
            opacity: parseFloat(cs.opacity),
            role: classifyImageRole(img.el),
          };
        })
        .filter((im) => im.src && !im.src.startsWith("data:"));

      const secButtons = allBtn
        .filter(inRange)
        .slice(0, 4)
        .map((b) => ({
          label: truncate(b.el.textContent, 80),
          href: b.el.getAttribute("href") || null,
          backgroundColor: window.getComputedStyle(b.el).backgroundColor,
          color: window.getComputedStyle(b.el).color,
          borderRadius: window.getComputedStyle(b.el).borderRadius,
          padding: window.getComputedStyle(b.el).padding,
        }));

      const secContentLinks = allCL
        .filter(inRange)
        .slice(0, 6)
        .map((a) => ({
          href: a.el.getAttribute("href"),
          headingText: truncate(a.el.querySelector("h1,h2,h3,h4,h5,h6")?.textContent || "", 100),
          bodyText: truncate(a.el.querySelector("p")?.textContent || a.el.textContent || "", 150),
          hasDate: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(
            a.el.textContent || ""
          ),
        }));

      const secQuotes = allQ
        .filter(inRange)
        .slice(0, 3)
        .map((q) => {
          const authorEl = q.el.querySelector("[class*='author'],[class*='name'],cite,strong");
          const companyEl = q.el.querySelector(
            "[class*='company'],[class*='role'],[class*='title']"
          );
          return {
            quoteText: truncate(
              q.el.querySelector("p,[class*='text']")?.textContent || q.el.textContent || "",
              200
            ),
            author: truncate(authorEl?.textContent || "", 60),
            company: truncate(companyEl?.textContent || "", 60),
            href: closestHref(q.el),
          };
        });

      const hp = cur.el.closest("div,section") || cur.el.parentElement;
      const hcs = hp ? window.getComputedStyle(hp) : null;
      const isRow = (hcs?.display === "flex" && hcs?.flexDirection === "row") || false;
      const isGrid = hcs?.display === "grid" || false;

      const labelEl = Array.from(document.querySelectorAll("span,p,div")).find((el) => {
        const t = (el.textContent || "").trim();
        return (
          /^\d+\.\d+/.test(t) &&
          t.length < 40 &&
          centerY(el) >= rangeTop &&
          centerY(el) < rangeBottom
        );
      });
      const sectionLabel = labelEl
        ? { text: truncate(labelEl.textContent || "", 50), href: closestHref(labelEl) }
        : null;

      const secSvgImgs = secImages.filter((im) => im.isSvg);
      const secSmallImgs = secImages.filter((im) => im.displayH < 70 && im.displayW < 220);
      const isLogoBar =
        secSvgImgs.length >= 3 || (secSmallImgs.length >= 4 && secImages.length >= 4);

      virtualSections.push({
        tag: "virtual-section",
        role: null,
        id: null,
        ariaLabel: null,
        isRow,
        isGrid,
        isLogoBar,
        textSide: null,
        imageSide: null,
        contentLinks: secContentLinks,
        quotes: secQuotes,
        sectionLabel,
        padding: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
        backgroundColor: "rgba(0, 0, 0, 0)",
        backgroundImage: null,
        gridTemplateColumns: null,
        gap: null,
        height: Math.round(rangeBottom - rangeTop),
        viewportPct: Math.round(((rangeBottom - rangeTop) / window.innerHeight) * 100),
        headings: secHeadings,
        paragraphs: secParagraphs,
        buttons: secButtons,
        images: secImages,
        svgs: [],
        videos: [],
      });
    }

    sections = virtualSections
      .slice(0, 25)
      .filter((s) => s.headings.length > 0 || s.paragraphs.length > 0);
  } else {
    sections = deduped
      .slice(0, 20)
      .map((el) => sectionSummary(el))
      .filter(Boolean);
  }

  // ── IMAGE ROLE CLASSIFICATION ──────────────────────────────────
  function classifyImageRole(img) {
    const cs = window.getComputedStyle(img);
    const r = img.getBoundingClientRect();
    const opacity = parseFloat(cs.opacity);
    // Fall back to natural dimensions when the image hasn't been laid out yet (lazy-loaded)
    const effectiveW = r.width > 0 ? r.width : img.naturalWidth;
    const effectiveH = r.height > 0 ? r.height : img.naturalHeight;
    // Check parent chain for absolute/fixed positioning
    let parent = img.parentElement;
    let parentPos = "static";
    let parentZ = null;
    let depth = 0;
    while (parent && depth < 5) {
      const pcs = window.getComputedStyle(parent);
      if (pcs.position !== "static" && parentPos === "static") {
        parentPos = pcs.position;
        parentZ = pcs.zIndex === "auto" ? null : parseInt(pcs.zIndex);
      }
      parent = parent.parentElement;
      depth++;
    }
    // Background: low opacity + absolute/fixed parent
    if (opacity < 0.25 && (parentPos === "absolute" || parentPos === "fixed")) return "background";
    // Background: negative z-index on parent
    if ((parentPos === "absolute" || parentPos === "fixed") && parentZ !== null && parentZ < 0)
      return "background";
    // Small: tiny icons/avatars (use effective dimensions so unrendered large images aren't mis-classified)
    if (effectiveW < 60 && effectiveH < 60) return "small";
    // Hero: large feature images
    if (effectiveW > 400 || img.naturalWidth > 1000) return "hero";
    return "content";
  }

  // ── GLOBAL IMAGE COLLECTION ─────────────────────────────────────
  const allImages = Array.from(document.querySelectorAll("img"))
    .filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 20 || r.height > 20 || img.naturalWidth > 100;
    })
    .map((img) => {
      const r = img.getBoundingClientRect();
      const cs = window.getComputedStyle(img);
      return {
        src: getBestImgSrc(img, r.width),
        alt: img.alt || "",
        displayW: Math.round(r.width),
        displayH: Math.round(r.height),
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        isSvg: (img.getAttribute("src") || "").toLowerCase().includes(".svg"),
        href: closestHref(img),
        opacity: parseFloat(cs.opacity),
        zIndex: cs.zIndex === "auto" ? null : parseInt(cs.zIndex),
        position: cs.position,
        role: classifyImageRole(img),
        section: (() => {
          const parentSection = img.closest("section,[role='region'],main > div");
          if (parentSection) {
            const h2 = parentSection.querySelector("h2");
            if (h2) return truncate(h2.textContent || "", 50);
          }
          return null;
        })(),
      };
    })
    .filter((i) => i.src && !i.src.startsWith("data:"));

  const seen = new Set();
  const uniqueImages = allImages.filter((i) => {
    if (seen.has(i.src)) return false;
    seen.add(i.src);
    return true;
  });

  // ── BACKGROUND LAYER EXTRACTION ──────────────────────────────────

  // CSS lets a SINGLE element paint MULTIPLE stacked backgrounds via comma-separated
  // 'background-image'/'box-shadow' lists (e.g. "linear-gradient(...), radial-gradient(...),
  // url(logo.svg)" is one declaration that paints THREE layers). Treating the whole
  // computed-style string as one opaque blob — which 'truncate(cs.backgroundImage, N)'
  // does — collapses that genuinely-layered structure into a single flat 'cssValue',
  // which is exactly the loss the destination 'backgroundVariable.layers[]' array (one
  // entry per { fill }) was designed to avoid. Split on TOP-LEVEL commas only (commas
  // nested inside function args — 'rgba(0,0,0,.4)', gradient color-stop lists, multi-arg
  // 'url(...)' — must stay intact) so each individually-painted layer becomes its own
  // structured entry instead of one truncated string.
  function splitTopLevelCss(value) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.filter(Boolean);
  }

  // Sub-classify an individual (already-split) background-image layer by its CSS
  // function. Kept as a SEPARATE 'gradientType' field (rather than replacing 'kind')
  // so the existing 'kind:"gradientOrImage"' contract that downstream prompt-building
  // already switches on stays intact — this only ADDS fidelity (radial vs. linear vs.
  // conic vs. plain image are visually distinct and worth distinguishing) without
  // changing the enum consumers pattern-match against.
  function classifyBgImageLayer(value) {
    const v = value.toLowerCase();
    if (v.startsWith("radial-gradient") || v.startsWith("repeating-radial-gradient"))
      return "radial-gradient";
    if (v.startsWith("conic-gradient") || v.startsWith("repeating-conic-gradient"))
      return "conic-gradient";
    if (v.startsWith("linear-gradient") || v.startsWith("repeating-linear-gradient"))
      return "linear-gradient";
    if (v.startsWith("url(")) return "image";
    return null;
  }

  // Expand a (possibly multi-layer) 'background-image' computed-style string into one
  // structured entry per layer, splitting comma-joined per-layer 'background-size'/
  // 'background-position'/'background-repeat' lists in lockstep so each layer keeps its
  // own positioning data rather than inheriting the first layer's values for all of them.
  // Field is named 'bgPosition' (not 'position') so it never collides with an element's
  // CSS 'position' (static/absolute/fixed) when callers merge this with element metadata —
  // the original code conflated the two under the same 'position' key in different branches,
  // which would silently shadow one or the other depending on Object.assign() merge order.
  function expandBackgroundImageLayers(source, cs) {
    if (!cs.backgroundImage || cs.backgroundImage === "none") return [];
    const images = splitTopLevelCss(cs.backgroundImage);
    const sizes = splitTopLevelCss(cs.backgroundSize);
    const positions = splitTopLevelCss(cs.backgroundPosition);
    const repeats = splitTopLevelCss(cs.backgroundRepeat);
    return images.map((cssValue, i) => ({
      source,
      kind: "gradientOrImage",
      gradientType: classifyBgImageLayer(cssValue),
      cssValue: truncate(cssValue, 800),
      size: sizes[i] || sizes[0] || cs.backgroundSize,
      bgPosition: positions[i] || positions[0] || cs.backgroundPosition,
      repeat: repeats[i] || repeats[0] || cs.backgroundRepeat,
      attachment: cs.backgroundAttachment,
    }));
  }

  // Expand a (possibly multi-shadow) 'box-shadow' computed-style string into one
  // structured glow entry per shadow — layered glows ("0 0 200px red, 0 0 400px blue, …",
  // a common technique for multi-color atmospheric haloes) previously collapsed into one
  // 'boxShadowGlow' entry carrying the entire joined string as a single 'cssValue'.
  function expandBoxShadowLayers(source, cs, extra) {
    if (!cs.boxShadow || cs.boxShadow === "none") return [];
    return splitTopLevelCss(cs.boxShadow).map((cssValue) =>
      Object.assign(
        {
          source,
          kind: "boxShadowGlow",
          cssValue: truncate(cssValue, 400),
        },
        extra
      )
    );
  }

  function extractBackgroundLayers() {
    const layers = [];
    const bodyCs = window.getComputedStyle(document.body);
    const htmlCs = window.getComputedStyle(document.documentElement);

    // 1. HTML element background
    if (htmlCs.backgroundColor !== "rgba(0, 0, 0, 0)") {
      layers.push({ source: "html", kind: "color", fill: htmlCs.backgroundColor });
    }
    layers.push(...expandBackgroundImageLayers("html", htmlCs));

    // 2. Body element background
    if (
      bodyCs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
      bodyCs.backgroundColor !== htmlCs.backgroundColor
    ) {
      layers.push({ source: "body", kind: "color", fill: bodyCs.backgroundColor });
    }
    layers.push(...expandBackgroundImageLayers("body", bodyCs));

    // 3. ::before and ::after pseudo-elements (common for gradient overlays — and,
    // like any element, capable of painting MULTIPLE stacked gradients themselves)
    const before = window.getComputedStyle(document.body, "::before");
    if (before.content !== "none" && before.content !== "normal") {
      for (const layer of expandBackgroundImageLayers("body::before", before)) {
        layers.push(
          Object.assign({ kind: "pseudo-gradient" }, layer, {
            opacity: before.opacity,
            zIndex: before.zIndex,
          })
        );
      }
    }
    const after = window.getComputedStyle(document.body, "::after");
    if (after.content !== "none" && after.content !== "normal") {
      for (const layer of expandBackgroundImageLayers("body::after", after)) {
        layers.push(
          Object.assign({ kind: "pseudo-gradient" }, layer, {
            opacity: after.opacity,
            zIndex: after.zIndex,
          })
        );
      }
    }

    // 4. Fixed/absolute overlay divs acting as background (low/negative z-index, full viewport)
    const overlays = Array.from(document.querySelectorAll("div, section"))
      .filter((el) => {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const z = cs.zIndex === "auto" ? 0 : parseInt(cs.zIndex);
        return (
          (cs.position === "fixed" || cs.position === "absolute") &&
          z < 0 &&
          rect.width > window.innerWidth * 0.5 &&
          (cs.backgroundImage !== "none" || cs.backgroundColor !== "rgba(0, 0, 0, 0)")
        );
      })
      .flatMap((el) => {
        const cs = window.getComputedStyle(el);
        const z = cs.zIndex === "auto" ? null : parseInt(cs.zIndex);
        const meta = {
          tag: el.tagName.toLowerCase(),
          position: cs.position,
          zIndex: z,
          opacity: cs.opacity,
          pointerEvents: cs.pointerEvents,
          inset: cs.inset,
        };
        const imageLayers = expandBackgroundImageLayers("overlay", cs).map((layer) =>
          Object.assign({}, layer, meta, { fill: layer.cssValue })
        );
        if (imageLayers.length > 0) return imageLayers;
        // No background-image layers — fall back to the flat color as a single layer.
        return [
          Object.assign({ source: "overlay", kind: "color", fill: cs.backgroundColor }, meta),
        ];
      });
    layers.push(...overlays);

    // 5. Atmospheric glow divs in main section (React inline-style glow effects, z-index 0-2)
    // These are absolutely/fixed-positioned full-width divs that paint a glow via gradient
    // backgrounds (often SEVERAL stacked gradients in one declaration — e.g. a radial glow
    // layered over a linear wash), blurred solid fills ('background-color' + 'filter:
    // blur(...)'), or layered box-shadow halos — applied via JS/React rather than CSS
    // body/html rules, so the checks above (which require a CSS-gradient backgroundImage,
    // or negative z-index) miss all three. Each stacked gradient/shadow becomes its own
    // structured layer entry rather than one joined-string blob.
    const mainEl = document.querySelector("main, [role='main']");
    if (mainEl) {
      const atmosphericDivs = Array.from(mainEl.querySelectorAll("div"))
        .filter((el) => {
          const cs = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const z = cs.zIndex === "auto" ? 0 : parseInt(cs.zIndex);
          if (!(cs.position === "absolute" || cs.position === "fixed")) return false;
          if (!(z >= 0 && z < 3) || rect.width <= window.innerWidth * 0.5) return false;
          const hasGradientOrImage = cs.backgroundImage !== "none";
          const hasBlurGlow =
            cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.filter.includes("blur");
          const hasBoxShadowGlow = cs.boxShadow !== "none";
          return hasGradientOrImage || hasBlurGlow || hasBoxShadowGlow;
        })
        .slice(0, 6)
        .flatMap((el) => {
          const cs = window.getComputedStyle(el);
          const meta = {
            source: "atmospheric",
            backgroundColor: cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : null,
            filter: cs.filter !== "none" ? truncate(cs.filter, 200) : null,
            position: cs.position,
            opacity: cs.opacity,
            zIndex: cs.zIndex === "auto" ? null : parseInt(cs.zIndex),
          };
          // NOTE: do NOT override 'size'/'bgPosition' here — 'layer' already carries the
          // correctly per-layer-split values from expandBackgroundImageLayers; re-applying
          // the whole joined cs.backgroundSize/backgroundPosition strings would silently
          // undo that lockstep splitting and put layer 2's position back on layer 1.
          const gradientLayers = expandBackgroundImageLayers("atmospheric", cs).map((layer) =>
            Object.assign({}, meta, layer)
          );
          if (gradientLayers.length > 0) return gradientLayers;

          if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.filter.includes("blur")) {
            return [Object.assign({}, meta, { kind: "blurGlow", cssValue: cs.backgroundColor })];
          }
          if (cs.boxShadow !== "none") {
            return expandBoxShadowLayers("atmospheric", cs, meta);
          }
          return [];
        });
      layers.push(...atmosphericDivs);
    }

    return layers;
  }

  const backgroundLayers = extractBackgroundLayers();
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;

  const allHeadings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter((h) => h.getBoundingClientRect().height > 0)
    .map((h) => ({
      level: parseInt(h.tagName[1]),
      text: (h.textContent || "").trim().slice(0, 200),
      y: Math.round(h.getBoundingClientRect().top + window.scrollY),
      href: closestHref(h),
    }));

  return JSON.stringify({
    url: location.href,
    title: document.title,
    metaDescription:
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    viewportWidth: window.innerWidth,
    pageHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    bodyBg: bodyBg !== "rgba(0, 0, 0, 0)" ? bodyBg : htmlBg,
    backgroundLayers,
    header: sectionSummary(headerEl),
    footer: sectionSummary(footerEl),
    sections,
    allImages: uniqueImages,
    allHeadings,
  });
};
