import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import axios from 'axios'

export const downloadTeamLogo = async (
  teamId: number,
  logoUrl: string,
  league: number,
) => {
  const uploadDir = join(process.cwd(), 'public', 'logos')

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  const filePath = join(uploadDir, `${league}-${teamId}.png`)

  if (existsSync(filePath)) {
    return `/logos/${teamId}.png`
  }

  //  Descargamos
  const response = await axios({
    url: logoUrl,
    method: 'GET',
    responseType: 'stream',
  })

  // La guardamos en el disco
  const writer = createWriteStream(filePath)
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(`/logos/${teamId}.png`))
    writer.on('error', reject)
  })
}
