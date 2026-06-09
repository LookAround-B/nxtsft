import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser, serializeBigInt } from "../helper";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      include: {
        property: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(serializeBigInt(leads));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const bodySchema = z.object({
      propertyId: z.string(),
      contactName: z.string(),
      contactEmail: z.string().email(),
      contactPhone: z.string(),
      source: z.string().optional(),
      notes: z.string().optional(),
    });

    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: result.data.propertyId },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        propertyId: result.data.propertyId,
        userId: user.id,
        contactName: result.data.contactName,
        contactEmail: result.data.contactEmail,
        contactPhone: result.data.contactPhone,
        status: "New",
        source: result.data.source,
        notes: result.data.notes,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json(serializeBigInt(lead), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
