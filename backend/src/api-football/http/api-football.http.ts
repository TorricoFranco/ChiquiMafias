import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
@Injectable()
export class ApiFootballHttp {
  private client: AxiosInstance

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {
    const apiKey = this.configService.get('API_FOOTBALL_KEY', { infer: true })
    this.client = axios.create({
      baseURL: 'https://v3.football.api-sports.io',
      headers: {
        'x-apisports-key': apiKey,
      },
    })
  }

  get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, { params })
  }
}
