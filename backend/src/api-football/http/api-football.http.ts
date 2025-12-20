import axios from 'axios'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ApiFootballHttp {
  constructor() {
    console.log('API FOOTBALL KEY:', process.env.API_FOOTBALL_KEY)
  }

  private client = axios.create({
    baseURL: 'https://v3.football.api-sports.io',
    headers: {
      'x-apisports-key': process.env.API_FOOTBALL_KEY,
    },
  })

  get<T>(url: string, params?: any) {
    return this.client.get<T>(url, { params })
  }
}
