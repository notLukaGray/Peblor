"use client";

// Layout projection hooks (useInstantLayoutTransition, useInstantTransition, useResetProjection)
// are intentionally not re-exported here. They require the domMax feature bundle, and the
// codebase uses domAnimation globally. Currently no consumer needs them.
