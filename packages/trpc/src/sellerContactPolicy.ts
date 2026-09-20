/** These display values are constructed on the server, never CSS-blurred. */
export function maskContact<
  T extends { name: string; phone?: string | null; email?: string | null },
>(contact: T, unlocked: boolean) {
  if (unlocked) return contact;
  const digits = contact.phone?.replace(/\D/g, "") ?? "";
  return {
    ...contact,
    name: contact.name ? `${contact.name.trim().charAt(0)}••••` : "Buyer",
    phone:
      digits.length >= 10
        ? `${digits.length > 10 ? `+${digits.slice(0, -10)} ` : ""}${digits.slice(-10, -8)}XXXXXX${digits.slice(-2)}`
        : null,
    email: contact.email
      ? `${contact.email.charAt(0)}••••@${contact.email.split("@")[1] ?? "••••"}`
      : null,
  };
}

export function sellerLeadsReturnPath(propertyId?: string) {
  return `/user-portal${propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ""}#leads`;
}
