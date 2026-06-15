import Link from "next/link";

const DEV_ROUTES = [
  { href: "/dev/elements", label: "Elements" },
  { href: "/dev/backgrounds", label: "Backgrounds" },
  { href: "/dev/colors", label: "Colors" },
  { href: "/dev/fonts", label: "Fonts" },
  { href: "/dev/style", label: "Style" },
  { href: "/dev/layout", label: "Layout" },
  { href: "/dev/triggers", label: "Triggers" },
  { href: "/dev/modals", label: "Modals" },
  { href: "/dev/modules", label: "Modules" },
  { href: "/dev/page", label: "Page Composer" },
  { href: "/dev/tools", label: "Tools" },
  { href: "/dev/workbench", label: "Workbench" },
  { href: "/dev/playground", label: "Playground" },
] as const;

export default function StudioIndexPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Peblor Studio</h1>
      <nav>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {DEV_ROUTES.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} style={{ color: "inherit" }}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
