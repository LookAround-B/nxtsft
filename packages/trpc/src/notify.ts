import prisma from "@nxtsft/db";

// Staff-role → portal base path, for building role-aware actionUrls on
// fan-out notifications (each recipient lands in their own portal).
const PORTAL_BASE: Record<string, string> = {
  "super-admin": "/sa-portal",
  admin: "/admin-portal",
  supervisor: "/supervisor-portal",
  sales: "/sales-portal",
  "support-admin": "/support-portal",
};
export const portalBase = (role: string): string => PORTAL_BASE[role] ?? "/user-portal";

export type NotifyArgs = {
  userId: string;
  type: string;
  title: string;
  content?: string | null;
  actionUrl?: string | null;
};

/**
 * Create an in-app notification (surfaces in the header bell).
 *
 * Best-effort: swallows its own errors so a notification write can never
 * roll back or fail the business mutation that triggered it. Awaited by
 * callers so the row is written before the request returns (safer than a
 * detached promise under serverless, where the instance may freeze early).
 */
export async function notify(args: NotifyArgs): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        type: args.type,
        title: args.title,
        content: args.content ?? null,
        actionUrl: args.actionUrl ?? null,
      },
    });
  } catch {
    // never throw — notifications are non-critical
  }
}

const CREDIT_REASON_TITLE: Record<string, string> = {
  welcome: "Welcome credits added",
  demo: "Demo credits added",
  purchase: "Credits purchased",
  contact_unlock: "Contact unlocked",
  designer_contact_unlock: "Designer contact unlocked",
};

/**
 * Notify a user of a wallet change, deriving human copy from the credit
 * transaction `reason`. Mirror this at every `creditTransaction.create` site.
 */
export async function notifyCredit(args: {
  userId: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
}): Promise<void> {
  const { userId, type, amount, reason } = args;
  const unit = amount === 1 ? "credit" : "credits";
  const sign = type === "credit" ? "+" : "−";
  const title =
    CREDIT_REASON_TITLE[reason] ?? (type === "credit" ? "Credits added" : "Credits spent");
  await notify({
    userId,
    type: type === "credit" ? "credit_added" : "credit_spent",
    title,
    content: `${sign}${amount} ${unit} · wallet updated`,
    actionUrl: "/user-portal#credits",
  });
}
