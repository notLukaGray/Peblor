"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type M1ColorSeeds,
  type M1RowState,
  type M1ThemeMode,
  detectHarmony,
  initialM1Rows,
  proposeM1Values,
  suggestSeeds,
} from "@/app/theme/palette-suggest";
import {
  DEV_NEUTRAL_M1_SEEDS_DARK,
  DEV_NEUTRAL_M1_SEEDS_LIGHT,
} from "@/app/dev/colors/color-tool-baseline";
import { M1_TOKEN_IDS, type M1TokenId } from "@/app/theme/pb-color-tokens";
import type { ColorToolPersistedV2 } from "@/app/dev/colors/color-tool-persistence";
import {
  clearWorkbenchColors,
  getWorkbenchSession,
  patchWorkbenchColors,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import { buildThemeConfigFileExport } from "./color-tool-export";
import { ColorToolWorkspace } from "./color-tool-workspace";

export function ColorToolClient() {
  const [initialColors] = useState<ColorToolPersistedV2>(() => {
    const saved = getWorkbenchSession().colors;
    return (
      saved ?? {
        seedsLight: DEV_NEUTRAL_M1_SEEDS_LIGHT,
        seedsDark: DEV_NEUTRAL_M1_SEEDS_DARK,
        rowsLight: initialM1Rows(DEV_NEUTRAL_M1_SEEDS_LIGHT, "light"),
        rowsDark: initialM1Rows(DEV_NEUTRAL_M1_SEEDS_DARK, "dark"),
        syncSeedsAcrossThemes: true,
      }
    );
  });
  const [seedsLight, setSeedsLight] = useState<M1ColorSeeds>(initialColors.seedsLight);
  const [seedsDark, setSeedsDark] = useState<M1ColorSeeds>(initialColors.seedsDark);
  const [rowsLight, setRowsLight] = useState<Record<M1TokenId, M1RowState>>(
    initialColors.rowsLight
  );
  const [rowsDark, setRowsDark] = useState<Record<M1TokenId, M1RowState>>(initialColors.rowsDark);
  const [editTheme, setEditTheme] = useState<M1ThemeMode>("light");
  const [syncSeedsAcrossThemes, setSyncSeedsAcrossThemes] = useState(
    initialColors.syncSeedsAcrossThemes === true
  );
  const [hydrated] = useState(true);
  const [exportCopied, setExportCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    const syncColorsFromSession = () => {
      const next = getWorkbenchSession().colors;
      if (next) {
        setSeedsLight(next.seedsLight);
        setSeedsDark(next.seedsDark);
        setRowsLight(next.rowsLight);
        setRowsDark(next.rowsDark);
        setSyncSeedsAcrossThemes(next.syncSeedsAcrossThemes === true);
      } else {
        setSeedsLight(DEV_NEUTRAL_M1_SEEDS_LIGHT);
        setSeedsDark(DEV_NEUTRAL_M1_SEEDS_DARK);
        setRowsLight(initialM1Rows(DEV_NEUTRAL_M1_SEEDS_LIGHT, "light"));
        setRowsDark(initialM1Rows(DEV_NEUTRAL_M1_SEEDS_DARK, "dark"));
        setSyncSeedsAcrossThemes(false);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== WORKBENCH_SESSION_STORAGE_KEY) return;
      syncColorsFromSession();
    };
    const onWorkbenchCustom = () => syncColorsFromSession();
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onWorkbenchCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onWorkbenchCustom);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: ColorToolPersistedV2 = {
      seedsLight,
      seedsDark,
      rowsLight,
      rowsDark,
      syncSeedsAcrossThemes,
    };
    patchWorkbenchColors(payload);
  }, [hydrated, seedsLight, seedsDark, rowsLight, rowsDark, syncSeedsAcrossThemes]);

  const resolvedLight = useMemo(
    () => proposeM1Values(seedsLight, rowsLight, "light"),
    [seedsLight, rowsLight]
  );
  const resolvedDark = useMemo(
    () => proposeM1Values(seedsDark, rowsDark, "dark"),
    [seedsDark, rowsDark]
  );

  const seeds = editTheme === "light" ? seedsLight : seedsDark;
  const rows = editTheme === "light" ? rowsLight : rowsDark;
  const resolved = editTheme === "light" ? resolvedLight : resolvedDark;

  const harmonyFit = useMemo(() => detectHarmony(seeds, rows), [seeds, rows]);

  const setRows = editTheme === "light" ? setRowsLight : setRowsDark;
  const setSeeds = editTheme === "light" ? setSeedsLight : setSeedsDark;

  const displayValue = useCallback(
    (id: M1TokenId) => (rows[id].confirmed ? rows[id].value : resolved[id]),
    [rows, resolved]
  );

  const setSeed = (key: keyof M1ColorSeeds, v: string) => {
    if (syncSeedsAcrossThemes) {
      setSeedsLight((s) => ({ ...s, [key]: v }));
      setSeedsDark((s) => ({ ...s, [key]: v }));
    } else {
      setSeeds((s) => ({ ...s, [key]: v }));
    }
  };

  const onSyncSeedsToggle = (checked: boolean) => {
    setSyncSeedsAcrossThemes(checked);
    if (checked) {
      const source = editTheme === "light" ? seedsLight : seedsDark;
      const next = { ...source };
      setSeedsLight(next);
      setSeedsDark(next);
    }
  };

  const onConfirmToggle = (id: M1TokenId, checked: boolean) => {
    setRows((r) => {
      const seedsNow = editTheme === "light" ? seedsLight : seedsDark;
      if (checked) {
        const v = proposeM1Values(seedsNow, r, editTheme)[id];
        return { ...r, [id]: { ...r[id], confirmed: true, value: v } };
      }
      return { ...r, [id]: { ...r[id], confirmed: false } };
    });
  };

  const onValueInput = (id: M1TokenId, v: string) => {
    setRows((r) => ({ ...r, [id]: { ...r[id], value: v, confirmed: true } }));
  };

  const onRefresh = (id: M1TokenId) => {
    setRows((r) => {
      if (r[id].confirmed) return r;
      return { ...r, [id]: { ...r[id], rowVariant: r[id].rowVariant + 1 } };
    });
  };

  const onShuffleSeeds = () => {
    const { seedsLight, seedsDark } = suggestSeeds();
    setSeedsLight(seedsLight);
    setSeedsDark(seedsDark);
  };

  const onShuffleAll = () => {
    setRows((r) => {
      const next = { ...r };
      for (const id of M1_TOKEN_IDS) {
        if (!r[id].confirmed) next[id] = { ...r[id], rowVariant: r[id].rowVariant + 1 };
      }
      return next;
    });
  };

  /** Local reset: clears only this tool's saved state and restores built-in defaults. */
  const resetColorTool = () => {
    clearWorkbenchColors();
    setSeedsLight(DEV_NEUTRAL_M1_SEEDS_LIGHT);
    setSeedsDark(DEV_NEUTRAL_M1_SEEDS_DARK);
    setRowsLight(initialM1Rows(DEV_NEUTRAL_M1_SEEDS_LIGHT, "light"));
    setRowsDark(initialM1Rows(DEV_NEUTRAL_M1_SEEDS_DARK, "dark"));
    setSyncSeedsAcrossThemes(false);
    setEditTheme("light");
    setExportCopied(false);
  };

  const exportText = buildThemeConfigFileExport(resolvedLight, resolvedDark);

  const copyExportWithFlash = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <ColorToolWorkspace
      resetColorTool={resetColorTool}
      editTheme={editTheme}
      setEditTheme={setEditTheme}
      syncSeedsAcrossThemes={syncSeedsAcrossThemes}
      onSyncSeedsToggle={onSyncSeedsToggle}
      harmonyFit={harmonyFit}
      rows={rows}
      seeds={seeds}
      setSeed={setSeed}
      onShuffleSeeds={onShuffleSeeds}
      displayValue={displayValue}
      onValueInput={onValueInput}
      onConfirmToggle={onConfirmToggle}
      onRefresh={onRefresh}
      onShuffleAll={onShuffleAll}
      resolved={resolved}
      resolvedLight={resolvedLight}
      resolvedDark={resolvedDark}
      exportText={exportText}
      copyExportWithFlash={copyExportWithFlash}
      exportCopied={exportCopied}
    />
  );
}
