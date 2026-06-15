() => {
  function sectionLayout(el) {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const firstH = el.querySelector("h1,h2,h3,h4");
    const heading = firstH ? (firstH.textContent || "").trim().slice(0, 60) : null;

    // Direct flex/grid children — capture their widths as % of section width
    // so we can detect "two equal columns" vs "stacked single column"
    const children = Array.from(el.children)
      .map((child) => {
        const ccs = window.getComputedStyle(child);
        const cr = child.getBoundingClientRect();
        return {
          widthPx: Math.round(cr.width),
          widthPct: rect.width > 0 ? Math.round((cr.width / rect.width) * 100) : null,
          flexBasis: ccs.flexBasis !== "auto" ? ccs.flexBasis : null,
          flexGrow: ccs.flexGrow !== "0" ? ccs.flexGrow : null,
          alignSelf: ccs.alignSelf !== "auto" ? ccs.alignSelf : null,
        };
      })
      .filter((c) => c.widthPx > 10);

    // Detect column count for grid layouts
    const gridCols =
      cs.display === "grid" ? cs.gridTemplateColumns.split(" ").filter(Boolean).length : null;

    return {
      heading,
      viewportWidth: window.innerWidth,
      display: cs.display,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap !== "nowrap" ? cs.flexWrap : null,
      alignItems: cs.alignItems !== "normal" ? cs.alignItems : null,
      justifyContent: cs.justifyContent !== "normal" ? cs.justifyContent : null,
      gap: cs.gap !== "0px" ? cs.gap : null,
      rowGap: cs.rowGap !== "0px" ? cs.rowGap : null,
      columnGap: cs.columnGap !== "0px" ? cs.columnGap : null,
      padding: cs.padding !== "0px" ? cs.padding : null,
      gridCols,
      heightPx: Math.round(rect.height),
      childCount: children.length,
      children,
      // Typography at this viewport for the first heading
      headingFontSize: firstH ? window.getComputedStyle(firstH).fontSize : null,
      headingLineHeight: firstH ? window.getComputedStyle(firstH).lineHeight : null,
    };
  }

  const sectionEls = Array.from(
    document.querySelectorAll(
      "header, main section, main article, main > div, [role='region'], footer"
    )
  )
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return r.height > 30 && cs.display !== "none" && cs.visibility !== "hidden";
    })
    .filter((el, i, arr) => !arr.some((other, j) => j !== i && other.contains(el) && other !== el))
    .slice(0, 16);

  // Also capture global type specimens at this viewport
  function typeDetail(el) {
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      padding: cs.padding,
    };
  }

  return JSON.stringify({
    viewportWidth: window.innerWidth,
    sections: sectionEls.map(sectionLayout),
    h1: typeDetail(document.querySelector("h1")),
    h2: typeDetail(document.querySelector("h2")),
    p: typeDetail(document.querySelector("p")),
    btn: typeDetail(document.querySelector("button, [role='button'], a[href]")),
  });
};
