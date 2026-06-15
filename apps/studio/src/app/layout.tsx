import type React from "react";
import { ThemeProvider } from "@/core/providers/theme-provider";

export const metadata = {
  title: "Peblor Studio",
  description: "Peblor dev studio — element, layout, style, color, and font workbench",
};

export default function StudioRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="peblor-studio-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
