import { PeblorDevRouteClient } from "@pb/runtime-react/dev-client";
import { DevRouteTheme } from "./DevRouteTheme";
import { assertDevRoute } from "@/core/lib/assert-dev";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  assertDevRoute();
  return (
    <DevRouteTheme>
      {children}
      <PeblorDevRouteClient />
    </DevRouteTheme>
  );
}
