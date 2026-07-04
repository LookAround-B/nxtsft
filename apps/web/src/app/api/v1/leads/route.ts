import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { createLeadSchema } from "@/lib/validation";
import { getAuthUser, rateLimitOrResponse } from "../helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimitOrResponse(req);
  if (limited) return limited;
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Visibility by role:
    //  - sales         → only leads assigned to them
    //  - other staff   → all leads
    //  - buyer/customer → only leads they created (their own enquiries)
    const isStaff = ["super-admin", "admin", "supervisor", "support-admin"].includes(user.role);
    let where: { assignedToId?: string; userId?: string } = {};
    if (user.role === "sales") where = { assignedToId: user.id };
    else if (!isStaff) where = { userId: user.id };

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
  const limited = await rateLimitOrResponse(req);
  if (limited) return limited;
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
