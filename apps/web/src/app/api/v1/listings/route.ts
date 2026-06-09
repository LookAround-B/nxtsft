import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser, serializeBigInt } from "../helper";

export async function GET(req: NextRequest) {
  try {
    const listings = await prisma.listing.findMany({
      include: {
        property: {
          include: {
            location: true,
          },
        },
        agent: {
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

    return NextResponse.json(serializeBigInt(listings));
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
      description: z.string().optional(),
      highlights: z.array(z.string()).default([]),
      active: z.boolean().default(true),
      promoted: z.boolean().default(false),
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

    const listing = await prisma.listing.create({
      data: {
        propertyId: result.data.propertyId,
        createdBy: user.id,
        description: result.data.description,
        highlights: result.data.highlights,
        active: result.data.active,
        promoted: result.data.promoted,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json(serializeBigInt(listing), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
