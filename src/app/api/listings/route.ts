import { prisma } from "@/lib/prisma";
import { PaymentPurpose, PaymentStatus } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const listingId = new URL(request.url).searchParams.get("listingId")?.trim()

    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          photos: {
            orderBy: {
              displayOrder: "asc",
            },
          },
        },
      })

      if (!listing) {
        return Response.json({ error: "Listing not found" }, { status: 404 })
      }

        return Response.json(
          {
            listing: {
              id: listing.id,
              title: listing.title,
              address: listing.address,
              price: Number(listing.price),
              status: listing.status,
              photoUrl: listing.photos[0]?.photoUrl ?? null,
            },
          },
          { status: 200 },
      )
    }

    const listings = await prisma.listing.findMany({
      where: {
        status: "active",
      },
      include: {
        photos: {
          orderBy: {
            displayOrder: "asc",
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const payload = listings.map((listing) => {
      const ratingCount = listing.reviews.length;
      const ratingAverage =
        ratingCount > 0
          ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
          : null;

      return {
        id: listing.id,
        title: listing.title,
        address: listing.address,
        status: listing.status,
        bedroomType: listing.bedroomType,
        amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
        price: Number(listing.price),
        mainWalkingMinutes: listing.mainWalkingMinutes,
        chiromoWalkingMinutes: listing.chiromoWalkingMinutes,
        parklandsWalkingMinutes: listing.parklandsWalkingMinutes,
        photoUrl: listing.photos[0]?.photoUrl ?? null,
        rating: ratingAverage,
        reviews: ratingCount,
      };
    });

    return Response.json({ listings: payload }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch listings", error);
    return new Response("Failed to fetch listings", { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();

  // --- TEXT DATA ---
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const address = String(formData.get("address") ?? "");
  const latitude = Number(formData.get("latitude") ?? 0);
  const longitude = Number(formData.get("longitude") ?? 0);

  const amenities = formData.getAll("amenities").map(item => String(item));

  const bedroomType = String(formData.get("bedroomType") ?? "");

  const mainWalkingMin = Number(formData.get("mainWalkingMin") ?? 0);
  const chiromoWalkingMin = Number(formData.get("chiromoWalkingMin") ?? 0);
  const parklandsWalkingMin = Number(formData.get("parklandsWalkingMin") ?? 0);

  // --- FILES ---
  const files = formData.getAll("photos") as File[];
  const checkoutRequestId = String(formData.get("checkoutRequestId") ?? "").trim();

  if (!checkoutRequestId) {
    return new Response("Payment is required before publishing", { status: 402 });
  }

  // get landlord profile
  const landlord = await prisma.landlordProfile.findUnique({
    where: { userId },
  });

  if (!landlord) {
    return new Response("Not a landlord", { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  if (!user?.phone?.trim()) {
    return new Response("Phone verification required before posting listings", { status: 403 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      checkoutRequestId,
      userId,
      purpose: PaymentPurpose.LISTING_FEE,
      status: PaymentStatus.SUCCESS,
      listingId: null,
    },
    select: {
      id: true,
    },
  });

  if (!payment) {
    return new Response("Listing payment not confirmed", { status: 402 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          landlordId: landlord.id,
          title,
          description,
          price,
          address,
          latitude,
          longitude,
          amenities,
          bedroomType,
          mainWalkingMinutes: mainWalkingMin,
          chiromoWalkingMinutes: chiromoWalkingMin,
          parklandsWalkingMinutes: parklandsWalkingMin,
          status: "active",
        },
      });

      const uploadDir = path.join(process.cwd(), "public/uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const photoData = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file || file.size === 0) continue;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileName = `${Date.now()}-${i}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, buffer);

        photoData.push({
          listingId: listing.id,
          photoUrl: `/uploads/${fileName}`,
          displayOrder: i,
        });
      }

      if (photoData.length > 0) {
        await tx.listingPhoto.createMany({
          data: photoData,
        });
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          listingId: listing.id,
          status: PaymentStatus.SUCCESS,
        },
      });
    });

    return new Response("Listing created", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error creating listing", { status: 500 });
  }
}
