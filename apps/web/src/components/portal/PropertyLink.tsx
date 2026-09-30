// One-click link from any lead list to the listing it's about (boss 09-30:
// "enable property links for all roles"). Opens in a new tab so the list
// the user is working stays put.
export function PropertyLink({
  property,
  fallback = "—",
  className = "",
}: {
  property?: { slug: string; title: string } | null;
  fallback?: string;
  className?: string;
}) {
  if (!property) return <>{fallback}</>;
  return (
    <a
      href={`/properties/${property.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`font-semibold text-accent hover:underline ${className}`}
    >
      {property.title}
    </a>
  );
}
