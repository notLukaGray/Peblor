import { notFound } from "next/navigation";

export function assertDevRoute(): void {
  if (process.env.NODE_ENV !== "development") notFound();
}
