// Reveal the first few letters of a name so it reads as a real person, while
// still hiding the rest: "Shekar Prasad" -> "Shek•••• P•••". Only the contact
// *number* is fully gated (see maskContact) — names/emails are partially shown.
function maskName(name?: string | null): string {
  const n = name?.trim();
  if (!n) return "Buyer";
  const [first, ...rest] = n.split(/\s+/);
  const head = first!.length > 4 ? `${first!.slice(0, 4)}••••` : first!;
  const tail = rest
    .map((p) => (p ? `${p.charAt(0)}•••` : ""))
    .filter(Boolean)
    .join(" ");
  return tail ? `${head} ${tail}` : head;
}

// "shekar.prasad1@gmail.com" -> "shek••••@gmail.com" (domain kept).
function maskEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local) return null;
  const head = local.length > 4 ? `${local.slice(0, 4)}••••` : local;
  return `${head}@${domain ?? "••••"}`;
}

/** These display values are constructed on the server, never CSS-blurred. */
export function maskContact<
  T extends { name: string; phone?: string | null; email?: string | null },
>(contact: T, unlocked: boolean) {
  if (unlocked) return contact;
  const digits = contact.phone?.replace(/\D/g, "") ?? "";
  return {
    ...contact,
    name: maskName(contact.name),
    // The number stays fully gated — this is the value a paid unlock buys.
    phone:
      digits.length >= 10
        ? `${digits.length > 10 ? `+${digits.slice(0, -10)} ` : ""}${digits.slice(-10, -8)}XXXXXX${digits.slice(-2)}`
        : null,
    email: maskEmail(contact.email),
  };
}

export function sellerLeadsReturnPath(propertyId?: string) {
  return `/user-portal${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ""}#leads`;
}
