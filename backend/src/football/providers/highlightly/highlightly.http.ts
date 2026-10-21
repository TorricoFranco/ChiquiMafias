import axios, { AxiosInstance } from 'axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'

export interface HighlightlyResponse<T> {
  status: number
  data: T
}

/** Cliente HTTP de Highlightly. Solo lo usa `HighlightlyProvider`. */
@Injectable()
export class HighlightlyHttp {
  private client: AxiosInstance

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const apiKey = this.configService.get('HIGHLIGHTLY_API_KEY', {
      infer: true,
    })
    this.client = axios.create({
      baseURL: 'https://soccer.highlightly.net',
      headers: { 'x-rapidapi-key': apiKey },
      timeout: 20_000,
      // Los 4xx los decide el proveedor (404 = sin datos todavía).
      validateStatus: (status) => status < 500,
    })
  }

  async get<T>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<HighlightlyResponse<T>> {
    const res = await this.client.get<T>(url, { params })
    return { status: res.status, data: res.data }
  }
}
