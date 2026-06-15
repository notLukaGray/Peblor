type Props = {
  segments: string[];
};

function segmentToLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Server-rendered breadcrumb navigation.
 *
 * Derives breadcrumbs from the current URL segments:
 * - Splits by `/`, capitalizes each segment, replaces hyphens with spaces
 * - First item is always "Home" linking to `/`
 * - Last item is the current page (not linked)
 */
export function Breadcrumbs({ segments }: Props) {
  if (!segments?.length) return null;

  const items = [
    { name: "Home", path: "/" },
    ...segments.map((segment, index) => ({
      name: segmentToLabel(segment),
      path: `/${segments.slice(0, index + 1).join("/")}`,
    })),
  ];

  const isCurrentPage = (index: number) => index === items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="px-6 pt-6 pb-0">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden="true" className="mx-0.5 select-none text-muted-foreground/40">
                /
              </span>
            )}
            {isCurrentPage(index) ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.name}
              </span>
            ) : (
              <a href={item.path} className="transition-colors duration-150 hover:text-foreground">
                {item.name}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
