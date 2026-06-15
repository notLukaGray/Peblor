"use client";

import dynamic from "next/dynamic";

const ToastContainer = dynamic(
  () =>
    import("@pb/runtime-react/peblor/section/toast/ToastContainer").then((m) => m.ToastContainer),
  { ssr: false }
);

export function ToastIsland() {
  return <ToastContainer />;
}
