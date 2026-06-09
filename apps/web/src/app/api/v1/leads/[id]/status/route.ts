import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser } from "../../../helper";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
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
