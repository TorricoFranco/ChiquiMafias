import { Prisma } from '@prisma/client'
import { FootballVenue } from '../football.types'

type PrismaTx = Prisma.TransactionClient

export async function upsertVenue(
  prisma: PrismaTx,
  venue?: FootballVenue | null,
): Promise<string | null> {
  if (!venue || !venue.name) return null

  try {
    const existingVenue =
      (venue.externalId
        ? await prisma.venues.findUnique({
            where: { api_venue_id: venue.externalId },
            select: { id: true },
          })
        : null) ??
      (await prisma.venues.findFirst({
        where: { name: venue.name },
        select: { id: true },
      }))

    const data: any = {
      name: venue.name,
      city: venue.city ?? null,
      capacity: venue.capacity ?? null,
      surface: venue.surface ?? null,
      image_url: venue.image ?? null,
    }

    if (venue.externalId !== null && venue.externalId !== undefined) {
      data.api_venue_id = venue.externalId
    }

    if (existingVenue) {
      // Un proveedor que no informa un dato no debe borrar el que ya teníamos.
      const present = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== null && v !== undefined),
      )
      const updated = await prisma.venues.update({
        where: { id: existingVenue.id },
        data: present,
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
