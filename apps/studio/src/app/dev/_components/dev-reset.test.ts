import { describe, expect, it } from "vitest";
import { STORAGE_KEY as BUTTON_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/button/constants";
import { STORAGE_KEY as INPUT_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/input/constants";
import { STORAGE_KEY as MODEL3D_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/model-3d/constants";
import { STORAGE_KEY as RANGE_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/range/constants";
import { STORAGE_KEY as RICH_TEXT_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/rich-text/constants";
import { STORAGE_KEY as RIVE_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/rive/constants";
import { STORAGE_KEY as SCROLL_PROGRESS_BAR_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/scroll-progress-bar/constants";
import { STORAGE_KEY as SPACER_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/spacer/constants";
import { STORAGE_KEY as SVG_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/svg/constants";
import { STORAGE_KEY as VECTOR_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/vector/constants";
import { STORAGE_KEY as VIDEO_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/video/constants";
import { STORAGE_KEY as VIDEO_TIME_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/video-time/constants";
import { DEV_TOOL_STORAGE_KEYS } from "./dev-reset";

describe("dev-reset", () => {
  it("includes all legacy element keys in total reset coverage", () => {
    expect(DEV_TOOL_STORAGE_KEYS).toContain(BUTTON_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(RICH_TEXT_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(INPUT_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(RANGE_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(VIDEO_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(VIDEO_TIME_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(VECTOR_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(SVG_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(MODEL3D_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(RIVE_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(SPACER_ELEMENT_LEGACY_KEY);
    expect(DEV_TOOL_STORAGE_KEYS).toContain(SCROLL_PROGRESS_BAR_ELEMENT_LEGACY_KEY);
  });
});
