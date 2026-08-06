import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { notify } from "./notify";
import { sendTemplateIfConfigured } from "./bhashsms";

// Rep-assisted selling (CRM V3): a sales rep collects a customer's property
// details on a call and lists it for them. The listing must belong to the
// CUSTOMER from the moment it is created — never to the rep — so we resolve (or
// mint) the customer's seller account here, before the property row exists.
//
// Rep-created seller accounts are pre-approved (verified: true): a rep has
// already spoken to the customer, so the admin approval step that guards
// self-service signups adds nothing. Being verified is also what lets the
// customer log in with a phone OTP and take over their own listing.

/** Roles that must never be repurposed as a listing owner. */
const NON_CUSTOMER_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"];

export type ResolvedCustomer = {
  id: string;
  name: string;
  phone: string;
  /** true when this call minted the account (vs. reusing an existing one). */
  created: boolean;
  /** true when an existing buyer/pending account was upgraded to an approved seller. */
  promoted: boolean;
};

/**
 * Find the seller account for a customer phone, creating a pre-approved
 * `home-seller` if there isn't one. Existing accounts are upgraded in place:
 * a buyer ("user") becomes a home-seller, and a signup still awaiting approval
 * is approved — the rep contact IS the verification.
 *
 * Throws (rather than silently listing under the rep) when the phone belongs to
 * a staff account, or when the derived email is already taken by someone else.
 */
export async function findOrCreateCustomerAccount(opts: {
  phone: string;
  name: string;
  email?: string | null;
  city?: string | null;
  /** Sales rep acting on the customer's behalf — recorded on new accounts. */
  createdById: string;
}): Promise<ResolvedCustomer> {
  const { phone, name, email, city, createdById } = opts;

  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, name: true, phone: true, role: true, verified: true, active: true },
  });

  if (existing) {
    if (NON_CUSTOMER_ROLES.includes(existing.role)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This number belongs to a staff account — it can't own a customer listing.",
      });
    }
    if (!existing.active) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This customer's account is deactivated. Ask an admin to reactivate it first.",
      });
    }

    const promote = existing.role === "user";
    const approve = !existing.verified;
    if (promote || approve) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(promote ? { role: "home-seller" } : {}),
          ...(approve ? { verified: true, verifiedAt: new Date() } : {}),
        },
      });
      await notify({
        userId: existing.id,
        type: "account_approved",
        title: "Your seller account is active",
        content:
          "Our team set up seller access for you. Log in with your mobile number to track your listing.",
        actionUrl: "/user-portal#mylist",
      });
    }

    return {
      id: existing.id,
      name: existing.name,
      phone: existing.phone ?? phone,
      created: false,
      promoted: promote || approve,
    };
  }

  // Customers reached by phone usually have no email. A synthetic address keeps
  // the unique column satisfied; they can set a real one from their profile.
  const derivedEmail = (email?.trim() || `lead.${phone}@nxtsft.internal`).toLowerCase();
  const emailTaken = await prisma.user.findUnique({ where: { email: derivedEmail }, select: { id: true } });
  if (emailTaken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `The email ${derivedEmail} is already registered to another account. Clear it on the lead and retry.`,
    });
  }

  const created = await prisma.user.create({
    data: {
      name,
      phone,
      email: derivedEmail,
      role: "home-seller",
      city: city?.trim() || "—",
      verified: true,
      verifiedAt: new Date(),
      metadata: { source: "sales-rep-listing", createdById },
    },
    select: { id: true, name: true, phone: true },
  });

  await notify({
    userId: created.id,
    type: "account_approved",
    title: "Your NxtSft seller account is ready",
    content:
      "Our team created your account while listing your property. Log in with your mobile number (OTP) to manage it.",
    actionUrl: "/user-portal#mylist",
  });
  // Best-effort — no-ops until the template env var is set (see docs).
  void sendTemplateIfConfigured("BHASHSMS_TEMPLATE_SELLER_WELCOME", created.phone, [created.name]);

  return { id: created.id, name: created.name, phone: created.phone ?? phone, created: true, promoted: false };
}
