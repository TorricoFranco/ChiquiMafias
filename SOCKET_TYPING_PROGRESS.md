# Socket Events Typing Strategy

## ✅ Completado

### 1. Tipos Backend (`backend/src/types/socket-events.ts`)
- ✅ `LeagueLiveScore` - Estructura para cada match en liga
- ✅ `MatchLiveUpdatePayload` - Scores y minutos
- ✅ `StatsUpdatedPayload` - Stats por equipo
- ✅ `TimelineUpdatedPayload` - Eventos de timeline
- ✅ `MatchMessagePayload` - Mensajes por partido
- ✅ `ChatMessagePayload` - Mensajes globales
- ✅ `ServerToClientEvents` - Tipos de emisiones del servidor
- ✅ `ClientToServerEvents` - Tipos de solicitudes del cliente

### 2. Tipos Frontend (`frontend/types/socketEvents.ts`)
- ✅ Copias de los tipos del backend (duplicados por seguridad)
- ✅ Tipos adicionales: `TeamStats`, `StatisticData`

### 3. Hooks Tipados
- ✅ `useChatSocket` - Tipado con `ChatMessagePayload[]`
- ✅ `useLeagueLive` - Tipado con `LeagueLiveScore`
- ⏳ `useMatchLive` - Por actualizar
- ⏳ `usePollSocket` - Sin revisar
- ⏳ `useMatchesChat` - Sin revisar

## 🐛 Bug Encontrado

### stats_updated emite solo matchId
En `backend/src/matches/matches.gateway.ts` línea ~46:
```typescript
case 'STATS_UPDATED':
  const { stats } = update.payload
  this.server.to(room).emit('stats_updated', {
    matchId: update.matchId,
    stats,  // ← Recibiste solo { matchId }, stats no va
  })
```

**Posible causa**: `update.payload` no tiene `stats` o está mal formateado.

## ⏳ Próximos Pasos

1. **Verifica que stats_updated se emita correctamente**
   - Backend: Revisa qué hay en `update.payload` cuando es `STATS_UPDATED`
   - Frontend: Verifica si `console.log` muestra `{ matchId, stats: [...] }`

2. **Tipea useMatchLive completamente**
   - timeline_updated
   - stats_updated
   - match_live_update
   - goal_scored

3. **Tipea otros hooks**
   - usePollSocket
   - useMatchesChat

4. **Usa tipos en gateways del backend**
   - Importa tipos en `fixture.gateway.ts`
   - Importa tipos en `matches.gateway.ts`
   - Importa tipos en `chat.gateway.ts`

## 📋 Estructura de Payloads Confirmados

✅ **on-message (Chat Global)**
```typescript
{
  userId: string;
  name: string;
  teamName: string;
  message: string;
}
```

✅ **on_league_update**
```typescript
Record<string, {
  h: number;
  a: number;
  hp: number;
  ap: number;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  elapsed: number;
  isLive: boolean;
  isPlayoff: boolean;
}>
```

⏳ **stats_updated** (BUGUEADO - ve qué recibe realmente)
⏳ **timeline_updated** (No pudiste ver)
⏳ **match_live_update** (Ver si se emite)
