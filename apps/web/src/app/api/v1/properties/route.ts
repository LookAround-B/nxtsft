import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { queryParamsSchema, createPropertySchema } from "@/lib/validation";
import { getAuthUser, serializeBigInt } from "../helper";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Validate query parameters
    const queryParams = queryParamsSchema.safeParse({
      city: searchParams.get("city"),
      type: searchParams.get("type"),
      purpose: searchParams.get("purpose"),
      bedrooms: searchParams.get("bedrooms") ? Number(searchParams.get("bedrooms")) : undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      search: searchParams.get("search"),
    });

    if (!queryParams.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { city, type, purpose, bedrooms, minPrice, maxPrice, search } = queryParams.data;
    const whereClause: any = { deletedAt: null, status: "Active" };

    if (city) {
      whereClause.location = {
        city: { equals: city, mode: "insensitive" },
      };
    }
    if (type) {
      whereClause.type = type;
    }
    if (purpose) {
      whereClause.purpose = purpose;
    }
    if (bedrooms !== undefined) {
      whereClause.bedrooms = bedrooms;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined) {
        whereClause.price.gte = BigInt(minPrice);
      }
      if (maxPrice !== undefined) {
        whereClause.price.lte = BigInt(maxPrice);
      }
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        location: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(serializeBigInt(properties));
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createPropertySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid property data", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { city, state, locality, address, zipCode, latitude, longitude, price, area, ...rest } = result.data;

    const slug = `${rest.title}-${city}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .concat(`-${Date.now()}`);

    const property = await prisma.property.create({
      data: {
        ...rest,
        slug,
        price: BigInt(price),
        pricePerSqft: Math.round(price / area),
        area,
        ownerId: user.id,
        location: {
          create: {
            city,
            state,
            locality,
            address,
            zipCode,
            latitude,
            longitude,
          },
        },
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json(serializeBigInt(property), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
