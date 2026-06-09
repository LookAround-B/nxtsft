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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const bodySchema = z.object({
      status: z.string(),
    });

    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    try {
      const lead = await prisma.lead.update({
        where: { id },
        data: { status: result.data.status },
      });
      return NextResponse.json(serializeBigInt(lead));
    } catch (err) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
