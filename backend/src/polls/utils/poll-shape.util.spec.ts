import { BadRequestException } from '@nestjs/common'
import { buildPollShape, parsePollOptions } from './poll-shape.util'

describe('buildPollShape', () => {
  describe('CLASSIC', () => {
    it('numera las opciones desde 1 y no lleva config', () => {
      const shape = buildPollShape({
        type: 'CLASSIC',
        labels: ['Boca', 'River'],
      })

      expect(shape.options).toEqual([
        { id: 1, label: 'Boca' },
        { id: 2, label: 'River' },
      ])
      expect(shape.config).toBeNull()
      expect(shape.ticketCost).toBe(1)
      expect(shape.requiresEndsAt).toBe(true)
    })

    it('recorta los espacios de cada opción', () => {
      const shape = buildPollShape({
        type: 'CLASSIC',
        labels: ['  Boca  ', 'River'],
      })

      expect(shape.options[0].label).toBe('Boca')
    })

    it('rechaza menos de 2 opciones', () => {
      expect(() =>
        buildPollShape({ type: 'CLASSIC', labels: ['Boca'] }),
      ).toThrow(BadRequestException)
    })

    it('rechaza más de 6 opciones', () => {
      expect(() =>
        buildPollShape({
          type: 'CLASSIC',
          labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        }),
      ).toThrow(BadRequestException)
    })

    it('rechaza opciones vacías', () => {
      expect(() =>
        buildPollShape({ type: 'CLASSIC', labels: ['Boca', '   '] }),
      ).toThrow('La opción 2 está vacía')
    })

    it('rechaza opciones repetidas sin importar las mayúsculas', () => {
      expect(() =>
        buildPollShape({ type: 'CLASSIC', labels: ['Boca', 'BOCA'] }),
      ).toThrow('Las opciones no pueden repetirse')
    })

    it('rechaza escudos en un tipo que no los admite', () => {
      expect(() =>
        buildPollShape({
          type: 'CLASSIC',
          labels: ['Boca', 'River'],
          teamIds: ['435', '451'],
        }),
      ).toThrow('Una encuesta clásica no lleva escudos')
    })
  })

  describe('VERSUS', () => {
    it('sin escudos cuesta 1 ticket', () => {
      const shape = buildPollShape({
        type: 'VERSUS',
        labels: ['Messi', 'Maradona'],
      })

      expect(shape.ticketCost).toBe(1)
      expect(shape.options[0].teamId).toBeUndefined()
    })

    it('con escudos cuesta 2 tickets', () => {
      const shape = buildPollShape({
        type: 'VERSUS',
        labels: ['Boca', 'River'],
        teamIds: ['451', '435'],
      })

      expect(shape.ticketCost).toBe(2)
      expect(shape.options).toEqual([
        { id: 1, label: 'Boca', teamId: '451' },
        { id: 2, label: 'River', teamId: '435' },
      ])
    })

    it('admite escudo en un solo lado', () => {
      const shape = buildPollShape({
        type: 'VERSUS',
        labels: ['Boca', 'River'],
        teamIds: ['451', ''],
      })

      expect(shape.options[1].teamId).toBeUndefined()
      expect(shape.ticketCost).toBe(2)
    })

    it('exige exactamente 2 opciones', () => {
      expect(() =>
        buildPollShape({ type: 'VERSUS', labels: ['Boca', 'River', 'Racing'] }),
      ).toThrow('Una encuesta duelo lleva exactamente 2 opciones')
    })

    it('rechaza el mismo escudo dos veces', () => {
      expect(() =>
        buildPollShape({
          type: 'VERSUS',
          labels: ['Boca', 'River'],
          teamIds: ['451', '451'],
        }),
      ).toThrow('No podés usar el mismo escudo dos veces')
    })

    it('rechaza un escudo que no es un api_team_id', () => {
      expect(() =>
        buildPollShape({
          type: 'VERSUS',
          labels: ['Boca', 'River'],
          teamIds: ['/escudos-api/451.webp', ''],
        }),
      ).toThrow('Escudo inválido')
    })
  })

  describe('MATCH', () => {
    it('en layout VS inserta el empate entre los dos equipos', () => {
      const shape = buildPollShape({
        type: 'MATCH',
        labels: ['Boca', 'River'],
        teamIds: ['451', '435'],
        layout: 'VS',
      })

      expect(shape.options).toEqual([
        { id: 1, label: 'Boca', teamId: '451' },
        { id: 2, label: 'Empate' },
        { id: 3, label: 'River', teamId: '435' },
      ])
      expect(shape.config).toEqual({ layout: 'VS' })
      expect(shape.ticketCost).toBe(2)
    })

    it('en layout VS exige escudo en los dos equipos', () => {
      expect(() =>
        buildPollShape({
          type: 'MATCH',
          labels: ['Boca', 'River'],
          teamIds: ['451'],
          layout: 'VS',
        }),
      ).toThrow('Elegí el escudo de cada equipo')
    })

    it('en layout LIST admite escudo opcional por opción', () => {
      const shape = buildPollShape({
        type: 'MATCH',
        labels: ['Boca', 'River', 'Racing'],
        teamIds: ['451', '435', ''],
        layout: 'LIST',
      })

      expect(shape.options).toHaveLength(3)
      expect(shape.options[2]).toEqual({ id: 3, label: 'Racing' })
      expect(shape.config).toEqual({ layout: 'LIST' })
    })

    it('exige que se elija el formato', () => {
      expect(() =>
        buildPollShape({ type: 'MATCH', labels: ['Boca', 'River'] }),
      ).toThrow('Elegí el formato de la predicción')
    })
  })

  describe('tipos de opciones fijas', () => {
    it('FACTO genera las dos opciones', () => {
      const shape = buildPollShape({ type: 'FACTO', labels: [] })

      expect(shape.options).toEqual([
        { id: 1, label: 'Facto' },
        { id: 2, label: 'No facto' },
      ])
      expect(shape.ticketCost).toBe(1)
    })

    it('FACTO rechaza opciones mandadas por el creador', () => {
      expect(() =>
        buildPollShape({ type: 'FACTO', labels: ['Sí', 'No'] }),
      ).toThrow('son fijas')
    })

    it('INFO no lleva opciones y no exige fecha de cierre', () => {
      const shape = buildPollShape({ type: 'INFO', labels: [] })

      expect(shape.options).toEqual([])
      expect(shape.requiresEndsAt).toBe(false)
    })

    it('INFO rechaza opciones', () => {
      expect(() => buildPollShape({ type: 'INFO', labels: ['Sí'] })).toThrow(
        'Una encuesta informativa no lleva opciones',
      )
    })
  })

  describe('NEWS', () => {
    it('es votable y no exige fecha de cierre', () => {
      const shape = buildPollShape({
        type: 'NEWS',
        labels: ['Buen pase', 'Mal pase'],
      })

      expect(shape.options).toHaveLength(2)
      expect(shape.requiresEndsAt).toBe(false)
    })
  })

  describe('tipos todavía no habilitados', () => {
    it.each(['RATING', 'RANKING'] as const)('%s se rechaza', (type) => {
      expect(() => buildPollShape({ type, labels: [] })).toThrow(
        'todavía no están disponibles',
      )
    })
  })
})

describe('parsePollOptions', () => {
  it('devuelve el array tal cual cuando es válido', () => {
    expect(parsePollOptions([{ id: 1, label: 'Boca' }])).toEqual([
      { id: 1, label: 'Boca' },
    ])
  })

  it('devuelve vacío si el Json no es un array', () => {
    expect(parsePollOptions(null)).toEqual([])
    expect(parsePollOptions({ id: 1 })).toEqual([])
  })
})
