async () => {
  const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  let pos = 0;
  let stuck = 0;

  // ── "Ready" means PAINTABLE, not just "the network request finished" ──────
  // img.complete is true for BROKEN images too (404s resolve with complete:true,
  // naturalWidth:0) — relying on it alone is exactly how a hero slot ends up
  // blank/transparent in the captured snapshot: the script thinks the image is
  // "done" and moves on before a single pixel has actually been decoded. A truly
  // ready image satisfies complete && naturalWidth > 0 AND, where supported,
  // resolves decode() — which forces the browser to fully decode the bitmap
  // off-thread (catching the "complete but not yet painted" race that complete
  // alone can't see) before the snapshot/screenshot fires.
  async function isImageReady(img) {
    if (!(img.complete && img.naturalWidth > 0)) return false;
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // decode() rejects for genuinely-broken/zero-size images — naturalWidth
        // already gates those out above, so a rejection here means "can't decode,"
        // i.e. not ready, regardless of what 'complete' claimed.
        return false;
      }
    }
    return true;
  }

  async function allReady(imgs) {
    const results = await Promise.all(imgs.map((img) => isImageReady(img)));
    return results.every(Boolean);
  }

  async function waitForImages(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = Array.from(document.querySelectorAll("img")).filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > -200 && r.top < window.innerHeight + 200;
      });
      if (await allReady(visible)) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  }

  while (pos < total) {
    pos += 200;
    window.scrollTo(0, pos);
    const ok = await waitForImages(6000);
    if (!ok) stuck++;
    if (stuck > 8) break;
    await new Promise((r) => setTimeout(r, 80));
  }

  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 800));

  // ── Force-load any images that aren't paintable yet after the scroll ──────
  // Some lazy-loaded images (especially off-screen product screenshots) never
  // become ready even after a full scroll because their IntersectionObserver
  // threshold was never met (complete:false), or they decoded to a 0×0 bitmap
  // (complete:true, naturalWidth:0 — e.g. a placeholder swapped too late).
  // Switching them to eager and re-assigning src forces the browser to restart
  // the fetch+decode immediately rather than waiting on a observer that already
  // missed its window.
  const notReadyYet = [];
  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (!(await isImageReady(img))) notReadyYet.push(img);
  }
  for (const img of notReadyYet) {
    img.loading = "eager";
    const src = img.currentSrc || img.src || img.dataset.src || img.dataset.lazySrc || "";
    if (src && !src.startsWith("data:")) {
      img.src = "";
      img.src = src;
    }
  }
  // Give the browser up to 8s to fetch+decode the newly forced images, polling
  // isImageReady (not a fixed sleep) so we move on the moment they're paintable
  // instead of always paying the full timeout — and so a still-broken image
  // (genuinely 404ing) doesn't block the whole pipeline beyond the cap.
  if (notReadyYet.length > 0) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await allReady(notReadyYet)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const stillNotReady = [];
  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (!(await isImageReady(img))) stillNotReady.push(img);
  }

  return JSON.stringify({
    action: "scrolled",
    pageHeight: total,
    steps: Math.ceil(total / 200),
    stuckSteps: stuck,
    totalImages: document.querySelectorAll("img").length,
    forcedImages: notReadyYet.length,
    stillIncomplete: stillNotReady.length,
    stillIncompleteSrcs: stillNotReady
      .slice(0, 8)
      .map((img) => (img.currentSrc || img.src || "").slice(0, 120)),
  });
};
