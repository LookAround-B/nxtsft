import { NextRequest, NextResponse } from "next/server";
import prisma from "@nxtsft/db";
import { z } from "zod";
import { getAuthUser, serializeBigInt } from "../helper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    const purpose = searchParams.get("purpose");
    const bedrooms = searchParams.get("bedrooms");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");

    const whereClause: any = { deletedAt: null };

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
    if (bedrooms) {
      whereClause.bedrooms = parseInt(bedrooms);
    }
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) {
        whereClause.price.gte = BigInt(minPrice);
      }
      if (maxPrice) {
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
            email: true,
            phone: true,
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
      title: z.string(),
      description: z.string().optional(),
      type: z.string(),
      purpose: z.string(),
      price: z.number(),
      area: z.number(),
      bedrooms: z.number().default(0),
      bathrooms: z.number().default(0),
      balconies: z.number().default(0),
      parking: z.number().default(0),
      city: z.string(),
      state: z.string(),
      locality: z.string(),
      address: z.string().optional(),
      zipCode: z.string().optional(),
      latitude: z.number().default(0),
      longitude: z.number().default(0),
      amenities: z.array(z.string()).default([]),
      images: z.array(z.string()).default([]),
    });

    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    const { city, state, locality, address, zipCode, latitude, longitude, price, area, ...rest } = result.data;

    const property = await prisma.property.create({
      data: {
        ...rest,
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
