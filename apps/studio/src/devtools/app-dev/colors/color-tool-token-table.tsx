"use client";

import {
  contrastHintForToken,
  type M1RowState,
  type M1ThemeMode,
} from "@/app/theme/palette-suggest";
import {
  M1_ON_PAIR,
  M1_TOKEN_IDS,
  M1_TOKEN_META,
  type M1TokenId,
} from "@/app/theme/pb-color-tokens";
import { WcagBadge } from "./color-tool-preview-helpers";
import { NativeColorSwatch } from "./color-tool-native-swatch";

type Props = {
  rows: Record<M1TokenId, M1RowState>;
  resolved: Record<M1TokenId, string>;
  editTheme: M1ThemeMode;
  displayValue: (id: M1TokenId) => string;
  onValueInput: (id: M1TokenId, value: string) => void;
  onConfirmToggle: (id: M1TokenId, checked: boolean) => void;
  onRefresh: (id: M1TokenId) => void;
  onShuffleAll: () => void;
};

export function ColorToolTokenTable({
  rows,
  resolved,
  editTheme,
  displayValue,
  onValueInput,
  onConfirmToggle,
  onRefresh,
  onShuffleAll,
}: Props) {
  return (
    <section className="overflow-x-auto rounded-lg border border-border bg-card/10">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Tokens
        </span>
        <button
          type="button"
          className="rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          title="Re-roll all unlocked token rows"
          onClick={onShuffleAll}
        >
          Re-roll all
        </button>
      </div>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/60 bg-muted/10">
            {["Token", "", "Value", "Contrast", "Lock", ""].map((header, index) => (
              <th
                key={index}
                className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {M1_TOKEN_IDS.map((id) => {
            const ratio = contrastHintForToken(id, resolved);
            return (
              <tr key={id} className="border-b border-border/80 last:border-b-0">
                <td className="px-3 py-2.5 align-middle">
                  <span className="text-sm font-medium text-foreground">
                    {M1_TOKEN_META[id].label}
                  </span>
                  <div className="font-mono text-[10px] text-muted-foreground">{id}</div>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  {M1_ON_PAIR[id] ? (
                    <span
                      className="flex items-center gap-1"
                      title="Fill context · editable text color"
                    >
                      <span
                        className="h-8 w-5 shrink-0 rounded-l border border-border/40"
                        style={{ background: displayValue(M1_ON_PAIR[id]) }}
                      />
                      <NativeColorSwatch
                        cssValue={displayValue(id)}
                        onPickHex={(hex) => onValueInput(id, hex)}
                        size="sm"
                        ariaLabel={`${M1_TOKEN_META[id].label} color (${editTheme})`}
                      />
                    </span>
                  ) : (
                    <NativeColorSwatch
                      cssValue={displayValue(id)}
                      onPickHex={(hex) => onValueInput(id, hex)}
                      size="sm"
                      ariaLabel={`${M1_TOKEN_META[id].label} color (${editTheme})`}
                    />
                  )}
                </td>
                <td className="max-w-[min(280px,40vw)] px-3 py-2.5 align-middle">
                  <input
                    type="text"
                    className="w-full rounded border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={displayValue(id)}
                    onChange={(e) => onValueInput(id, e.target.value)}
                  />
                </td>
                <td className="px-3 py-2.5 align-middle">
                  {ratio != null ? (
                    <span className="flex items-center gap-1.5">
                      <WcagBadge ratio={ratio} />
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {ratio.toFixed(2)}∶1
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={rows[id].confirmed}
                      onChange={(e) => onConfirmToggle(id, e.target.checked)}
                    />
                    Lock
                  </label>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <button
                    type="button"
                    className="rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={rows[id].confirmed}
                    title={
                      rows[id].confirmed
                        ? "Uncheck lock to try another suggestion"
                        : "Re-roll suggestion"
                    }
                    onClick={() => onRefresh(id)}
                  >
                    Refresh
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
