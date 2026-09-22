import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, protectedProcedure, generalRateLimit } from "../server";
import { cuidSchema, safeString } from "../sanitize";
import { notify } from "../notify";
import { sendEmailIfConfigured } from "../email";

// Masked buyer<->seller messaging (#10). Conversations live in-app (the Message
// model); the other party is alerted by an in-app notification and an email that
// shows the sender's NAME only and links back to the dashboard — neither party's
// email address is ever exposed. A conversation is keyed on (other user,
// property). Email is a best-effort env-gated no-op until Resend is configured.

const PREVIEW_LEN = 140;

function preview(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > PREVIEW_LEN ? `${t.slice(0, PREVIEW_LEN)}…` : t;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function alertHtml(o: {
  recipientName: string;
  senderName: string;
  propertyTitle: string | null;
  body: string;
  url: string;
}): string {
  const about = o.propertyTitle ? ` about <strong>${escapeHtml(o.propertyTitle)}</strong>` : "";
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <p>Hi ${escapeHtml(o.recipientName)},</p>
    <p><strong>${escapeHtml(o.senderName)}</strong> sent you a message${about} on NxtSft:</p>
    <blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #14b8a6;background:#f1f5f9;border-radius:6px">
      ${escapeHtml(o.body)}
    </blockquote>
    <p>
      <a href="${o.url}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700">
        Reply in your dashboard
      </a>
    </p>
    <p style="color:#64748b;font-size:13px">
      To protect everyone's privacy, replies happen inside NxtSft — your email address is never shared.
    </p>
  </div>`;
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nxtsft.com").replace(/\/$/, "");

export const messagesRouter = router({
  // Conversation list for the current user, newest first. Grouped by the other
  // party + the property the thread is about.
  threads: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id;
    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: me }, { recipientId: me }] },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    type T = {
      otherUserId: string;
      propertyId: string | null;
      lastMessage: string;
      lastAt: Date;
      unread: number;
    };
    const map = new Map<string, T>();
    for (const m of msgs) {
      const otherId = m.senderId === me ? m.recipientId : m.senderId;
      const key = `${otherId}__${m.propertyId ?? ""}`;
      let t = map.get(key);
      if (!t) {
        // msgs is DESC, so the first row seen for a key is the latest.
        t = { otherUserId: otherId, propertyId: m.propertyId, lastMessage: m.content, lastAt: m.createdAt, unread: 0 };
        map.set(key, t);
      }
      if (m.recipientId === me && !m.read) t.unread++;
    }

    const threads = [...map.values()];
    const userIds = [...new Set(threads.map((t) => t.otherUserId))];
    const propIds = [...new Set(threads.map((t) => t.propertyId).filter((p): p is string => Boolean(p)))];
    const [users, props] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, avatar: true } })
        : Promise.resolve([]),
      propIds.length
        ? prisma.property.findMany({ where: { id: { in: propIds } }, select: { id: true, title: true, slug: true } })
        : Promise.resolve([]),
    ]);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const pMap = new Map(props.map((p) => [p.id, p]));

    return threads
      .map((t) => ({
        otherUserId: t.otherUserId,
        otherName: uMap.get(t.otherUserId)?.name ?? "NxtSft user",
        otherAvatar: uMap.get(t.otherUserId)?.avatar ?? null,
        propertyId: t.propertyId,
        propertyTitle: t.propertyId ? (pMap.get(t.propertyId)?.title ?? null) : null,
        propertySlug: t.propertyId ? (pMap.get(t.propertyId)?.slug ?? null) : null,
        lastMessage: t.lastMessage,
        lastAt: t.lastAt.toISOString(),
        unread: t.unread,
      }))
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }),

  // Full conversation with one person about one property (or the general thread,
  // propertyId omitted). Marks the current user's unread messages in it as read.
  thread: protectedProcedure
    .input(z.object({ otherUserId: cuidSchema, propertyId: cuidSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const me = ctx.user.id;
      const propFilter = input.propertyId ?? null;

      const msgs = await prisma.message.findMany({
        where: {
          propertyId: propFilter,
          OR: [
            { senderId: me, recipientId: input.otherUserId },
            { senderId: input.otherUserId, recipientId: me },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 500,
      });

      await prisma.message.updateMany({
        where: { recipientId: me, senderId: input.otherUserId, propertyId: propFilter, read: false },
        data: { read: true, readAt: new Date() },
      });

      const [other, property] = await Promise.all([
        prisma.user.findUnique({ where: { id: input.otherUserId }, select: { id: true, name: true, avatar: true } }),
        propFilter
          ? prisma.property.findUnique({ where: { id: propFilter }, select: { id: true, title: true, slug: true } })
          : Promise.resolve(null),
      ]);

      return {
        otherUser: other ?? { id: input.otherUserId, name: "NxtSft user", avatar: null },
        property,
        messages: msgs.map((m) => ({
          id: m.id,
          fromMe: m.senderId === me,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }),

  // Send a message. Free + rate-limited (masked channel, no contact info leaks).
  send: protectedProcedure
    .use(generalRateLimit)
    .input(
      z.object({
        recipientId: cuidSchema,
        propertyId: cuidSchema.optional(),
        content: safeString(2000, 1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = ctx.user.id;
      if (input.recipientId === me) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't message yourself." });
      }
      const recipient = await prisma.user.findUnique({
        where: { id: input.recipientId },
        select: { id: true, name: true, email: true },
      });
      if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found." });

      let propertyTitle: string | null = null;
      if (input.propertyId) {
        const p = await prisma.property.findFirst({
          where: { id: input.propertyId, deletedAt: null },
          select: { title: true },
        });
        propertyTitle = p?.title ?? null;
      }

      const msg = await prisma.message.create({
        data: {
          senderId: me,
          recipientId: input.recipientId,
          propertyId: input.propertyId ?? null,
          content: input.content,
        },
      });

      // In-app notification — masked: sender NAME, not email.
      await notify({
        userId: recipient.id,
        type: "message",
        title: `New message from ${ctx.user.name}`,
        content: propertyTitle
          ? `About "${propertyTitle}": ${preview(input.content)}`
          : preview(input.content),
        actionUrl: "/user-portal#messages",
      });

      // Email alert — best-effort, env-gated no-op until Resend is configured.
      // Never exposes either party's address.
      void sendEmailIfConfigured({
        to: recipient.email,
        subject: propertyTitle ? `New message about ${propertyTitle}` : "You have a new message on NxtSft",
        html: alertHtml({
          recipientName: recipient.name,
          senderName: ctx.user.name,
          propertyTitle,
          body: preview(input.content),
          url: `${siteUrl()}/user-portal#messages`,
        }),
      });

      return { ok: true, id: msg.id };
    }),

  // Unread total for the nav badge.
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return prisma.message.count({ where: { recipientId: ctx.user.id, read: false } });
  }),
});
