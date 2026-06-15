export type UnlockState =
  | { mode: "unlocked" }
  | { mode: "password-required"; redirectTo: string }
  | { mode: "unlock-page"; redirect: string | null }
  | { mode: "disabled" };

export type UnlockStateParams = {
  isEnabled: boolean;
  hasAccess: boolean;
  isProtected: boolean;
  isUnlockRoute: boolean;
  unlockRedirect: string | null;
};

export function resolveUnlockState(params: UnlockStateParams): UnlockState {
  const { isEnabled, hasAccess, isProtected, isUnlockRoute, unlockRedirect } = params;

  if (!isEnabled) return { mode: "disabled" };
  if (hasAccess) return { mode: "unlocked" };
  if (isUnlockRoute) return { mode: "unlock-page", redirect: unlockRedirect };
  if (isProtected) return { mode: "password-required", redirectTo: unlockRedirect ?? "/" };
  return { mode: "disabled" };
}
