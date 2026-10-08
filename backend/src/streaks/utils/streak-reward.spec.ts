import { calculateStreakCoins } from './streak-reward'

describe('calculateStreakCoins', () => {
  it('Debe crecer por día hasta el día 7 para un usuario FREE', () => {
    const coins = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      calculateStreakCoins(day, 'FREE'),
    )

    expect(coins).toEqual([100, 120, 144, 172, 207, 248, 298])
  })

  it('Debe mantenerse en el tope después del día 7', () => {
    expect(calculateStreakCoins(8, 'FREE')).toBe(298)
    expect(calculateStreakCoins(40, 'FREE')).toBe(298)
  })

  it('Debe aplicar el multiplicador del tier', () => {
    expect(calculateStreakCoins(7, 'TIER_1')).toBe(372)
    expect(calculateStreakCoins(7, 'TIER_2')).toBe(447)
    expect(calculateStreakCoins(7, 'TIER_3')).toBe(596)
  })

  it('Debe usar ×1 para un tier desconocido', () => {
    expect(calculateStreakCoins(7, 'NO_EXISTE')).toBe(298)
  })

  it('Debe tratar una racha en 0 como el día 1', () => {
    expect(calculateStreakCoins(0, 'FREE')).toBe(100)
  })
})
