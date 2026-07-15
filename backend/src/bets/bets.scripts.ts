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
