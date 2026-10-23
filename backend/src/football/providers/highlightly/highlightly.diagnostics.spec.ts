import { Logger } from '@nestjs/common'
import {
  HighlightlyQuota,
  resetUnmappedWarnings,
  warnUnmapped,
} from './highlightly.diagnostics'
import { mapEvents, mapStatistics, mapStatusShort } from './highlightly.mappers'

const HOUR = 60 * 60 * 1000

describe('Diagnóstico de Highlightly', () => {
  describe('[MAPEO]', () => {
    let warn: jest.SpyInstance

    beforeEach(() => {
      resetUnmappedWarnings()
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    })
    afterEach(() => warn.mockRestore())

    const messages = () =>
      (warn.mock.calls as unknown[][]).map((c) => String(c[0]))

    it('Debe avisar una sola vez por valor', () => {
      warnUnmapped('Estado', 'overtime')
      warnUnmapped('Estado', 'overtime', 'otro contexto')
      warnUnmapped('Estado', 'delayed')

      expect(messages()).toEqual([
        '[MAPEO] Estado sin traducir: "overtime"',
        '[MAPEO] Estado sin traducir: "delayed"',
      ])
    })

    it('Debe avisar un estado desconocido pero no uno conocido ni uno vacío', () => {
      expect(mapStatusShort('Second half')).toBe('2H')
      expect(mapStatusShort(null)).toBe('TBD')
      expect(mapStatusShort('Overtime break')).toBe('TBD')

      expect(messages()).toEqual([
        '[MAPEO] Estado sin traducir: "overtime break"',
      ])
    })

    it('Debe avisar un tipo de evento desconocido', () => {
      const team = { id: 1, name: 'Local', logo: 'l.png' }
      mapEvents([
        { type: 'Goal', time: "10'", team, player: 'A', playerId: 1 },
        { type: 'Penalty Shootout Goal', time: "121'", team, player: 'B' },
      ] as never)

      expect(messages()).toEqual([
        '[MAPEO] Evento sin traducir: "penalty shootout goal" (minuto 121\')',
      ])
    })

    it('Debe listar los nombres recibidos cuando falta una estadística esperada', () => {
      const team = { id: 1, name: 'Local', logo: 'l.png' }
      mapStatistics({
        team,
        statistics: [
          { displayName: 'Shots on target', value: 3 },
          { displayName: 'Ball possession', value: 0.55 },
        ],
      })

      const possession = messages().find((m) => m.includes('"possession"'))
      expect(possession).toBe(
        '[MAPEO] Estadística sin traducir: "possession" (recibidas: shots on target, ball possession)',
      )
      expect(messages().some((m) => m.includes('"shots on target"'))).toBe(
        false,
      )
    })

    it('No debe avisar estadísticas si el partido todavía no tiene ninguna', () => {
      mapStatistics({
        team: { id: 1, name: 'Local', logo: 'l.png' },
        statistics: [],
      })

      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('[CUOTA]', () => {
    const logger = { log: jest.fn(), warn: jest.fn() }
    let now: number
    let quota: HighlightlyQuota

    beforeEach(() => {
      jest.clearAllMocks()
      now = 0
      quota = new HighlightlyQuota(logger, () => now)
    })

    it('Debe resumir los pedidos por endpoint cada hora con la cuota restante', () => {
      const headers = {
        'x-ratelimit-requests-remaining': '7000',
        'x-ratelimit-requests-limit': '7500',
      }
      quota.record('/matches', 200, headers)
      quota.record('/matches/123', 200, headers)
      quota.record('/events/123', 200, headers)
      quota.record('/events/456', 404, headers)
      expect(logger.log).not.toHaveBeenCalled()

      now = HOUR
      quota.record('/events/789', 200, {
        'x-ratelimit-requests-remaining': '6990',
      })

      expect(logger.log).toHaveBeenCalledWith(
        '[CUOTA] 5 pedidos en la última hora (/events/:id: 2, /matches: 1, /matches/:id: 1, /events/:id (404): 1) · quedan 6990 de 7500',
      )

      // La ventana arranca de nuevo.
      now = HOUR + 1000
      quota.record('/matches', 200)
      expect(logger.log).toHaveBeenCalledTimes(1)
    })

    it('Debe contar los errores sin respuesta y aclarar si no hay dato de cuota', () => {
      quota.record('/matches', 'error')
      now = HOUR
      quota.record('/matches', 200)

      expect(logger.log).toHaveBeenCalledWith(
        '[CUOTA] 2 pedidos en la última hora (/matches (error): 1, /matches: 1) · sin dato de cuota',
      )
    })

    it('Debe avisar con menos del 20 % de la cuota, como mucho una vez por hora', () => {
      const low = {
        'x-ratelimit-requests-remaining': '1400',
        'x-ratelimit-requests-limit': '7500',
      }
      quota.record('/matches', 200, low)
      quota.record('/matches', 200, low)
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith(
        '[CUOTA] Quedan 1400 de 7500 pedidos de Highlightly (menos del 20 %)',
      )

      now = HOUR
      quota.record('/matches', 200, low)
      expect(logger.warn).toHaveBeenCalledTimes(2)
    })

    it('No debe avisar con la cuota holgada', () => {
      quota.record('/matches', 200, {
        'x-ratelimit-requests-remaining': '1500',
        'x-ratelimit-requests-limit': '7500',
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})
