import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser } from "../../../helper";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user || !["admin", "super-admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const schema = z.object({ assignedToId: z.string() });
    const result = schema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const assignee = await prisma.user.findUnique({ where: { id: result.data.assignedToId } });
    if (!assignee || assignee.role !== "sales") {
      return NextResponse.json({ error: "Assignee must be a sales rep" }, { status: 400 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { assignedToId: result.data.assignedToId, status: "New" },
    });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
