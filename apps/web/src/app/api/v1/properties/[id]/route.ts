import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { serializeBigInt } from "../../helper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const property = await prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        location: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(property));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
