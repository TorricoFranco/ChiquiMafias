import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ApiFootballHttp {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://v3.football.api-sports.io',
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY,
      },
    })
  }

  get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, { params })
  }
}
