"use client";
import { usePathname } from "next/navigation";
import { DevWorkbenchSessionDrawer } from "@/app/dev/_components/DevWorkbenchSessionDrawer";
import {
  DEV_WORKBENCH_NAV_GROUPS,
  DevWorkbenchNavDropdown,
} from "@/app/dev/_components/dev-workbench-nav-groups";

type Props = {
  onResetSection?: () => void;
  onTotalReset?: () => void;
};

export function DevWorkbenchNav({ onResetSection, onTotalReset }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="mb-6 w-full rounded-lg border border-border/80 bg-card/20 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {DEV_WORKBENCH_NAV_GROUPS.map((group) => (
            <DevWorkbenchNavDropdown key={group.title} group={group} pathname={pathname} />
          ))}
        </div>
        <DevWorkbenchSessionDrawer onResetSection={onResetSection} onTotalReset={onTotalReset} />
      </div>
    </nav>
  );
}
