import { buildDecisionsTemplate, parseDecisionsFile } from './decisions-file'
import { LinkPlan } from './plan-links'

const meta = {
  competition: 'copa-argentina',
  season: 2026,
  provider: 'highlightly',
}

const src = (externalId: number, name: string) => ({
  externalId,
  name,
  logo: null,
  country: null,
})

describe('buildDecisionsTemplate', () => {
  it('Debe dejar pendientes los dudosos y para crear los nuevos', () => {
    const plan = {
      teamsToConfirm: [
        {
          source: src(10, 'Gimnasia La Plata'),
          candidates: [
            {
              teamId: 't1',
              name: 'Gimnasia L.P.',
              score: 0.7777,
              reason: 'nombre',
            },
          ],
        },
      ],
      teamsToCreate: [
        {
          source: src(20, 'CA Estudiantes'),
          name: 'CA Estudiantes',
          closest: { teamId: 't2', name: 'Estudiantes L.P.', score: 0.333 },
        },
      ],
    } as unknown as LinkPlan

    expect(buildDecisionsTemplate(plan, meta)).toEqual({
      ...meta,
      teams: [
        {
          externalId: 10,
          providerName: 'Gimnasia La Plata',
          action: 'pending',
          teamId: null,
          candidates: [
            {
              teamId: 't1',
              name: 'Gimnasia L.P.',
              score: 0.78,
              reason: 'nombre',
            },
          ],
        },
        {
          externalId: 20,
          providerName: 'CA Estudiantes',
          action: 'create',
          name: 'CA Estudiantes',
          closest: 'Estudiantes L.P. (0.33)',
        },
      ],
    })
  })
})

describe('parseDecisionsFile', () => {
  const file = (teams: unknown[], over: Record<string, unknown> = {}) => ({
    ...meta,
    teams,
    ...over,
  })

  it('Debe leer las cuatro acciones', () => {
    const decisions = parseDecisionsFile(
      file([
        { externalId: 10, providerName: 'A', action: 'link', teamId: 't1' },
        { externalId: 20, providerName: 'B', action: 'create', name: 'Bé' },
        { externalId: 30, providerName: 'C', action: 'skip' },
        { externalId: 40, providerName: 'D', action: 'pending', teamId: null },
      ]),
      meta,
    )

    expect(decisions).toEqual({
      10: { action: 'link', teamId: 't1' },
      20: { action: 'create', name: 'Bé' },
      30: { action: 'skip' },
      40: { action: 'pending' },
    })
  })

  it('Debe rechazar un archivo de otra competición o temporada', () => {
    expect(() => parseDecisionsFile(file([], { season: 2025 }), meta)).toThrow(
      '"season" es 2025',
    )
  })

  it('Debe rechazar todo el archivo si una entrada es inválida', () => {
    expect(() =>
      parseDecisionsFile(
        file([
          { externalId: 10, providerName: 'A', action: 'link', teamId: 't1' },
          { externalId: 20, providerName: 'B', action: 'link', teamId: null },
          { externalId: 30, providerName: 'C', action: 'borrar' },
          { externalId: 10, providerName: 'A', action: 'skip' },
        ]),
        meta,
      ),
    ).toThrow(
      /"link" necesita "teamId"[\s\S]*acción "borrar" inválida[\s\S]*está repetido/,
    )
  })

  it('Debe rechazar un archivo sin lista de equipos', () => {
    expect(() => parseDecisionsFile({ ...meta }, meta)).toThrow('"teams"')
  })
})
