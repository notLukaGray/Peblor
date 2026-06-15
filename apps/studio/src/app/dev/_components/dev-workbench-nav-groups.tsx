import Link from "next/link";
import { ELEMENT_DEV_ENTRIES } from "@/app/dev/elements/element-dev-registry";

type NavItem = {
  label: string;
  href?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type NavGroup = {
  title: string;
  wip?: boolean;
  items: NavItem[];
};

export const DEV_WORKBENCH_NAV_GROUPS: NavGroup[] = [
  {
    title: "Foundations",
    items: [
      { label: "Color", href: "/dev/colors" },
      { label: "Fonts", href: "/dev/fonts" },
      { label: "Style", href: "/dev/style" },
    ],
  },
  {
    title: "Layout",
    items: [
      { label: "Pages", href: "/dev/layout/pages" },
      { label: "Sections", href: "/dev/layout/sections" },
      { label: "Columns", href: "/dev/layout/columns" },
      { label: "Scroll", href: "/dev/layout/scroll" },
      { label: "Frames", href: "/dev/layout/frames" },
      { label: "Section Trigger", href: "/dev/layout/section-trigger" },
      { label: "Reveal Section", href: "/dev/layout/reveal-section" },
      { label: "Form Block", href: "/dev/layout/form-block" },
      { label: "Divider", href: "/dev/layout/divider" },
    ],
  },
  {
    title: "Elements",
    items: [
      { label: "All Elements", href: "/dev/elements" },
      ...ELEMENT_DEV_ENTRIES.map((entry) => ({
        label: entry.navLabel,
        href: `/dev/elements/${entry.slug}`,
      })),
    ],
  },
  {
    title: "Preview",
    items: [
      { label: "Test Page", href: "/dev/test" },
      { label: "Style Guide", href: "/style-guide" },
    ],
  },
  {
    title: "Builder",
    wip: true,
    items: [
      { label: "Custom JSON", href: "/dev/custom" },
      { label: "Backgrounds", href: "/dev/backgrounds" },
      { label: "Modules", href: "/dev/modules" },
      { label: "Modals", href: "/dev/modals" },
      { label: "Triggers", href: "/dev/triggers" },
      { label: "Page", href: "/dev/page" },
    ],
  },
  {
    title: "Tools",
    items: [{ label: "HLS Converter", href: "/dev/tools/hls" }],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function DevWorkbenchNavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const groupIsActive = group.items.some(
    (item) => !!item.href && isActivePath(pathname, item.href)
  );
  return (
    <details className="relative">
      <summary
        className={`list-none cursor-pointer rounded border px-3 py-1.5 text-[11px] font-mono transition-colors ${
          groupIsActive
            ? "border-foreground/40 bg-foreground/10 text-foreground"
            : "border-border bg-background text-foreground hover:bg-muted/60"
        }`}
      >
        {group.title}
        {group.wip ? " (WIP)" : ""}
      </summary>
      <div className="absolute left-0 top-full z-40 mt-1 min-w-44 rounded-md border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-1">
          {group.items.map((item) => {
            if (!item.href || item.disabled) {
              return (
                <span
                  key={item.label}
                  className="inline-flex flex-col items-start gap-0.5 rounded border border-border/60 px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground"
                >
                  <span>{item.label}</span>
                  {item.disabledReason ? (
                    <span className="max-w-56 font-sans text-[10px] leading-snug text-muted-foreground/80">
                      {item.disabledReason}
                    </span>
                  ) : null}
                </span>
              );
            }
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center rounded border px-2.5 py-1.5 text-[11px] font-mono transition-colors ${
                  active
                    ? "border-foreground/40 bg-foreground/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}
