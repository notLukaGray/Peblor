#!/usr/bin/env python3
"""
Compare OLD presets_presplit pages vs NEW presets pages.

TWO-PASS strategy:
  Pass 1 — Structural: checks sectionOrder, definition keys, field presence.
  Pass 2 — Text content: collects every text/label/caption/description/alt
            leaf value from both sides and diffs them as sets. Catches cases
            where text disappeared into (or was corrupted by) a preset ref.

OLD: content/pages/presets_presplit/<page>/index.json  (monolithic)
NEW: content/pages/presets/<page>/index.json + sidecar *.json files

Sidecars: each <key>.json in the new dir contributes
  definitions["<key>"] = file_content  to the reconstructed definitions.

Special case — main landing page "index":
  OLD: content/pages/presets_presplit/index.json
  NEW: content/pages/presets/index.json + sidecars in content/pages/presets/ root

Usage:
  python3 scripts/compare_presets_split.py <agent-id> <page1> [page2 ...]
"""
import json
import os
import sys
from typing import Any

OLD_BASE = "content/pages/presets_presplit"
NEW_BASE = "content/pages/presets"
REPORT_DIR = "content/pages/presets_presplit/_reports"

issues: list[tuple[str, str, str]] = []  # (page, severity, message)

# ──────────────────────────────────────────────────────────────────────────────
# Loaders
# ──────────────────────────────────────────────────────────────────────────────

def load_old(page: str) -> dict:
    path = f"{OLD_BASE}/index.json" if page == "index" else f"{OLD_BASE}/{page}/index.json"
    with open(path) as f:
        return json.load(f)


def load_new(page: str) -> tuple[dict, dict]:
    """Returns (raw_index, reconstructed_definitions)."""
    new_dir = NEW_BASE if page == "index" else f"{NEW_BASE}/{page}"
    with open(f"{new_dir}/index.json") as f:
        data = json.load(f)
    defs: dict = dict(data.get("definitions", {}))
    for fname in sorted(os.listdir(new_dir)):
        if fname == "index.json" or not fname.endswith(".json"):
            continue
        key = fname[:-5]
        with open(f"{new_dir}/{fname}") as f:
            defs[key] = json.load(f)
    return data, defs

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def flag(page: str, severity: str, msg: str) -> None:
    issues.append((page, severity, msg))


def is_preset_only(val: Any) -> bool:
    """True when val's only meaningful key is 'preset' (may also have definitions/presets)."""
    if not isinstance(val, dict):
        return False
    meaningful = set(val.keys()) - {"definitions", "presets"}
    return meaningful == {"preset"}


def new_gained_preset(old_val: Any, new_val: Any) -> bool:
    if not isinstance(old_val, dict) or not isinstance(new_val, dict):
        return False
    return "preset" in new_val and "preset" not in old_val


# Fields directly visible to users — ALWAYS check for loss even inside presets.
CONTENT_FIELDS_STRICT = {
    "text", "label", "caption", "alt", "description",
    "src", "href", "url", "poster",
    "action", "actionPayload",
}

# Fields whose disappearance is acceptable when a preset was introduced
# (layout / styling absorbed by the preset).
# Everything NOT in CONTENT_FIELDS_STRICT is in this category.

# ──────────────────────────────────────────────────────────────────────────────
# Pass 1 — Structural diff
# ──────────────────────────────────────────────────────────────────────────────

def deep_compare(
    page: str, path: str, old_val: Any, new_val: Any, in_preset: bool = False
) -> None:
    """
    Recursively compare old vs new.
    `in_preset` = True means an ancestor node gained a preset — structural/
    styling fields at this depth may have been absorbed, but CONTENT_FIELDS_STRICT
    must still be preserved.
    """
    if old_val == new_val:
        return

    # ── Case A: NEW became a minimal preset ref (possibly with sub-definitions) ──
    if is_preset_only(new_val) and not is_preset_only(old_val):
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            # BUG FIX: check that direct content fields weren't silently dropped.
            for k in set(old_val.keys()) & CONTENT_FIELDS_STRICT:
                if k not in new_val:
                    flag(page, "MISSING_FIELD",
                         f"{path}.{k} — lost to preset ref "
                         f"(old={repr(old_val[k])[:80]})")
            # Recurse into sub-definitions (in preset scope from here down).
            old_sub = old_val.get("definitions", {})
            new_sub = new_val.get("definitions", {})
            compare_defs(page, f"{path}.definitions", old_sub, new_sub, in_preset=True)
        return

    # ── Case B: Both are dicts (possibly one gained a preset key) ──
    if isinstance(old_val, dict) and isinstance(new_val, dict):
        old_keys = set(old_val.keys())
        new_keys = set(new_val.keys())

        # Preset scope: this node OR any ancestor gained a preset.
        preset_scope = in_preset or new_gained_preset(old_val, new_val)

        # Missing fields
        for k in old_keys - new_keys:
            if preset_scope and k not in CONTENT_FIELDS_STRICT:
                continue  # layout/structure absorbed by preset — intentional
            flag(page, "MISSING_FIELD",
                 f"{path}.{k} (old={repr(old_val[k])[:80]})")

        # Extra fields — "preset" appearing in new is always expected
        ignore_extra = {"preset"} if "preset" not in old_keys else set()
        for k in new_keys - old_keys - ignore_extra:
            flag(page, "EXTRA_FIELD", f"{path}.{k}")

        # Recurse into common keys
        for k in old_keys & new_keys:
            deep_compare(page, f"{path}.{k}", old_val[k], new_val[k], preset_scope)

    # ── Case C: Lists ──
    elif isinstance(old_val, list) and isinstance(new_val, list):
        if old_val != new_val:
            flag(page, "CONTENT_DIFF",
                 f"{path}: {repr(old_val)[:100]} → {repr(new_val)[:100]}")

    # ── Case D: Scalar ──
    else:
        flag(page, "CONTENT_DIFF",
             f"{path}: {repr(old_val)[:100]} → {repr(new_val)[:100]}")


def compare_defs(
    page: str, path: str, old_defs: dict, new_defs: dict, in_preset: bool = False
) -> None:
    for key, old_val in old_defs.items():
        if key not in new_defs:
            flag(page, "MISSING_DEF", f"{path}.{key}")
        else:
            deep_compare(page, f"{path}.{key}", old_val, new_defs[key], in_preset)
    for key in new_defs:
        if key not in old_defs:
            flag(page, "EXTRA_DEF", f"{path}.{key}")

# ──────────────────────────────────────────────────────────────────────────────
# Pass 2 — Text content harvest (catch words that slipped through structural pass)
# ──────────────────────────────────────────────────────────────────────────────

TEXT_KEYS = {"text", "label", "caption", "alt", "description", "placeholder"}


def harvest_text(data: Any, texts: set[str]) -> None:
    """Collect every non-empty string under TEXT_KEYS, recursively."""
    if isinstance(data, dict):
        for k, v in data.items():
            if k in TEXT_KEYS and isinstance(v, str) and v.strip():
                # Normalise whitespace and common Unicode variants
                normed = (v.strip()
                          .replace("’", "'").replace("‘", "'")
                          .replace("“", '"').replace("”", '"')
                          .replace("—", "--").replace("–", "-"))
                texts.add(normed)
            else:
                harvest_text(v, texts)
    elif isinstance(data, list):
        for item in data:
            harvest_text(item, texts)


def text_diff(page: str, old_defs: dict, new_defs: dict) -> None:
    """Flag text strings present in OLD but absent anywhere in NEW."""
    old_texts: set[str] = set()
    new_texts: set[str] = set()
    harvest_text(old_defs, old_texts)
    harvest_text(new_defs, new_texts)

    lost = old_texts - new_texts
    if lost:
        for t in sorted(lost):
            flag(page, "TEXT_LOST",
                 f"'{t[:120]}' — present in OLD, not found anywhere in NEW")

# ──────────────────────────────────────────────────────────────────────────────
# Per-page comparison
# ──────────────────────────────────────────────────────────────────────────────

def normalize_dash(s: str) -> str:
    return s.replace("—", "—").replace(" — ", " — ")


def compare_page(page: str) -> None:
    try:
        old = load_old(page)
    except FileNotFoundError:
        flag(page, "ERROR",
             f"OLD not found: {OLD_BASE}/{'index.json' if page == 'index' else page + '/index.json'}")
        return

    try:
        new_idx, new_defs = load_new(page)
    except FileNotFoundError:
        flag(page, "ERROR",
             f"NEW not found: {NEW_BASE}/{'index.json' if page == 'index' else page + '/index.json'}")
        return

    old_defs = old.get("definitions", {})

    # Metadata
    ot, nt = old.get("title", ""), new_idx.get("title", "")
    if normalize_dash(ot) != normalize_dash(nt):
        flag(page, "METADATA_DIFF", f"title: {repr(ot)} → {repr(nt)}")

    for field in ["bgKey"]:
        ov, nv = old.get(field), new_idx.get(field)
        if ov != nv:
            flag(page, "METADATA_DIFF", f"{field}: {repr(ov)} → {repr(nv)}")

    if old.get("scroll") != new_idx.get("scroll"):
        flag(page, "SCROLL_DIFF",
             f"{repr(old.get('scroll'))[:80]} → {repr(new_idx.get('scroll'))[:80]}")

    # sectionOrder
    old_so = old.get("sectionOrder", [])
    new_so = new_idx.get("sectionOrder", [])
    for s in old_so:
        if s not in new_so:
            flag(page, "MISSING_SECTION", s)
    for s in new_so:
        if s not in old_so:
            flag(page, "EXTRA_SECTION", s)

    # Pass 1 — structural
    compare_defs(page, "definitions", old_defs, new_defs)

    # Pass 2 — text harvest (catches words that slipped through preset-ref branches)
    text_diff(page, old_defs, new_defs)

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python3 compare_presets_split.py <agent-id> <page1> [page2 ...]")
        sys.exit(1)

    agent_id = sys.argv[1]
    pages = sys.argv[2:]

    for page in pages:
        compare_page(page)

    os.makedirs(REPORT_DIR, exist_ok=True)
    report_path = f"{REPORT_DIR}/{agent_id}-report.md"

    # Group issues by page
    page_issues: dict[str, list[tuple[str, str]]] = {p: [] for p in pages}
    for pg, sev, msg in issues:
        page_issues[pg].append((sev, msg))

    ok_count = sum(1 for v in page_issues.values() if not v)
    total = sum(len(v) for v in page_issues.values())

    with open(report_path, "w") as out:
        out.write(f"# Agent {agent_id} — Preset Split Comparison Report\n\n")
        out.write(f"Pages checked: {len(pages)}  |  OK: {ok_count}/{len(pages)}  |  Issues: {total}\n\n")

        for page in pages:
            pg_issues = page_issues[page]
            status = "✅ OK" if not pg_issues else f"❌ {len(pg_issues)} issue(s)"
            out.write(f"## {page} — {status}\n\n")
            for sev, msg in pg_issues:
                out.write(f"- **{sev}**: {msg}\n")
            out.write("\n")

    print(f"Report → {report_path}")
    print(f"Pages: {len(pages)}  OK: {ok_count}  Issues: {total}")
    if issues:
        print("\nIssues:")
        for pg, sev, msg in issues:
            print(f"  [{sev}] {pg}: {msg}")


if __name__ == "__main__":
    main()
