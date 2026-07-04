import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser, rateLimitOrResponse } from "../../../helper";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimitOrResponse(req);
  if (limited) return limited;
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isStaff = ["super-admin", "admin", "supervisor", "sales", "support-admin"].includes(user.role);
    if (!isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!/^c[a-z0-9]{8,28}$/.test(id)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }
    const body = await req.json();
    const schema = z.object({
      status: z.enum(["Hot", "Warm", "Cold", "New", "Converted", "Lost"]),
    });
    const result = schema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const lead = await prisma.lead.update({ where: { id }, data: { status: result.data.status } });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
