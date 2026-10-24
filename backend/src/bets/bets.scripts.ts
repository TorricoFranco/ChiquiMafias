export const PLACE_BET_LUA_SCRIPT = `
  local wallet_key = KEYS[1]
  local market_key = KEYS[2]
  local option_key = KEYS[3]

  local amount = tonumber(ARGV[1])
  local current_time = tonumber(ARGV[2])

  -- Validar estado y tiempo
  local market_status = redis.call('HGET', market_key, 'status')
  if market_status ~= 'OPEN' then
      return cjson.encode({ error = "El mercado no está abierto" })
  end

  local closes_at = tonumber(redis.call('HGET', market_key, 'closesAt') or "0")
  if current_time >= closes_at then
      return cjson.encode({ error = "El mercado ha cerrado" })
  end

  -- Validar saldo
  local current_balance = tonumber(redis.call('GET', wallet_key) or "0")
  if current_balance < amount then
      return cjson.encode({ error = "Saldo insuficiente" })
  end

  -- Ejecutar descuentos e incrementos
  redis.call('DECRBY', wallet_key, amount)

  -- Guardar en una variable el nuevo total de esa opción para el front
  local new_option_pool = redis.call('HINCRBY', market_key, option_key, amount)

  return cjson.encode({ 
    ok = true, 
    new_balance = current_balance - amount,
    new_pool = new_option_pool
  })
`

// Cierra el mercado en Redis solo si sigue abierto. Es lo que corta las
// apuestas: PLACE_BET_LUA_SCRIPT exige status OPEN. Devuelve 1 si lo cerró.
export const LOCK_MARKET_LUA_SCRIPT = `
  local market_key = KEYS[1]
  if redis.call('HGET', market_key, 'status') == 'OPEN' then
      redis.call('HSET', market_key, 'status', 'LOCKED')
      return 1
  end
  return 0
`

// Cambia la hora de cierre en Redis solo si el mercado sigue abierto.
// ARGV[1] = closesAt en milisegundos. Devuelve 1 si lo cambió.
export const RESCHEDULE_MARKET_LUA_SCRIPT = `
  local market_key = KEYS[1]
  if redis.call('HGET', market_key, 'status') == 'OPEN' then
      redis.call('HSET', market_key, 'closesAt', ARGV[1])
      return 1
  end
  return 0
`
