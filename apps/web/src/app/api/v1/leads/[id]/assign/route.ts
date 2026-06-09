import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser, serializeBigInt } from "../../../helper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "super-admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const bodySchema = z.object({
      assignedTo: z.string(),
    });

    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    try {
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          status: "Contacted",
          notes: `Assigned to ${result.data.assignedTo}`,
        },
      });
      return NextResponse.json(serializeBigInt(lead));
    } catch (err) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
