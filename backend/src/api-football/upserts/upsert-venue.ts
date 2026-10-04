import { Prisma } from '@prisma/client'
import { ApiVenue } from '../interfaces/venue'

type PrismaTx = Prisma.TransactionClient

export async function upsertVenue(
  prisma: PrismaTx,
  venue?: ApiVenue,
): Promise<string | null> {
  if (!venue || !venue.name) return null

  try {
    const existingVenue =
      (venue.id
        ? await prisma.venues.findUnique({
          where: { api_venue_id: venue.id },
          select: { id: true },
        })
        : null)
      ?? await prisma.venues.findFirst({
        where: { name: venue.name },
        select: { id: true },
      })

    const data: any = {
      name: venue.name,
      city: venue.city ?? null,
      capacity: venue.capacity ?? null,
      surface: venue.surface ?? null,
      image_url: venue.image ?? null,
    }

    if (venue.id !== null && venue.id !== undefined) {
      data.api_venue_id = venue.id
    }

    if (existingVenue) {
      const updated = await prisma.venues.update({
        where: { id: existingVenue.id },
        data,
      })
      return updated.id
    }

    const created = await prisma.venues.create({
      data,
    })
    return created.id
  } catch (error) {
    console.error(`Error en estadio ${venue?.name}:`, error.message)
    return null
  }
}