import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { createListingSchema } from "@/lib/validation";
import { getAuthUser, serializeBigInt, rateLimitOrResponse } from "../helper";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"];

export async function GET(req: NextRequest) {
  const limited = await rateLimitOrResponse(req);
  if (limited) return limited;
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitOrResponse(req);
  if (limited) return limited;
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createListingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid listing data", details: result.error.flatten() },
        { status: 400 }
      );
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
