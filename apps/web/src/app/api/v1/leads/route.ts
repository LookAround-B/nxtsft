import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { createLeadSchema } from "@/lib/validation";
import { getAuthUser } from "../helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isStaff = ["super-admin", "admin", "supervisor", "sales", "support-admin"].includes(user.role);
    const where = isStaff && user.role === "sales" ? { assignedToId: user.id } : {};

    const leads = await prisma.lead.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (err: unknown) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const result = createLeadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid lead data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const property = await prisma.property.findFirst({
      where: { id: result.data.propertyId, deletedAt: null },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const lead = await prisma.lead.create({
      data: { ...result.data, userId: user.id, status: "New" },
      include: { property: { select: { id: true, title: true } } },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
