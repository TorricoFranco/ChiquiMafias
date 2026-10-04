# Especificación funcional para la nueva UI de detalle de partido

## Rol

Construye una nueva página de detalle de partido para ChiquiMafias.

La página debe ser una experiencia independiente al entrar en:

`/match/[id]`

El proyecto ya tiene estilos, componentes visuales y una estrategia de diseño. Debes reutilizar esa identidad visual y respetar sus convenciones. No debes inventar un sistema visual nuevo.

El objetivo principal de esta especificación es definir:

- Qué datos existen.
- Cómo se cargan.
- Qué estados puede tener un partido.
- Qué se muestra en cada estado.
- Cómo se actualiza la información en tiempo real.
- Qué ocurre cuando faltan datos o hay errores.
- Qué mocks deben crearse para probar cada escenario.

No copies literalmente la implementación anterior. Puedes reutilizar conceptos, pero la nueva interfaz debe tener una propuesta visual y de interacción diferente.

---

# 1. Fuentes de datos

La página recibe un `matchId` desde la URL.

Existen dos fuentes HTTP principales:

## 1.1 Detalle principal del partido

Endpoint conceptual:

`GET /matches/leagues/:leagueId/seasons/:season/matches/:matchId`

Devuelve la información principal del partido:

- Metadata.
- Equipos.
- Resultado.
- Estado actual.
- Eventos.
- Formaciones.
- Estadísticas.
- Estado del chat.

## 1.2 Información previa al partido

Endpoint conceptual:

`GET /matches/pre-match/:matchId`

Solo debe solicitarse para partidos que todavía no comenzaron.

Devuelve:

- Historial entre ambos equipos.
- Forma reciente.
- Mini tabla del torneo.
- Mini tabla anual.
- Promedios.

Esta información es independiente del objeto principal del partido.

---

# 2. Modelo de datos principal

## MatchDetails

```ts
type MatchDetails = {
  metadata: MatchMetadata;
  score: MatchScore;
  teams: {
    home: Team;
    away: Team;
  };
  lineups: MatchLineup[];
  events: MatchEvent[];
  stats: TeamStats[];
  isLive: boolean;
  chatActive: boolean;
};
```

## MatchMetadata

```ts
type MatchMetadata = {
  id: string;
  status: MatchStatus;
  status_long: string;
  date: string;       // Fecha ISO
  timestamp: number;  // Timestamp Unix
  referee: string | null;
  round: string;
  tournament: string;
  venue: Venue | null;
};
```

## Venue

```ts
type Venue = {
  name: string;
  city: string | null;
  image: string | null;
};
```

## Team

```ts
type Team = {
  id: string;
  name: string;
  logo: string | null;
  short_code: string | null;
};
```

## MatchScore

```ts
type MatchScore = {
  home: number;
  away: number;
  home_penalties: number | null;
  away_penalties: number | null;
  elapsed: number | null;
  summary: {
    goals: GoalSummary[];
    redCards: GoalSummary[];
    lastUpdate: string | null;
  };
};
```

## GoalSummary

```ts
type GoalSummary = {
  min: number;
  player: string;
  team: string;
};
```

Los valores de `home` y `away` pueden ser `0` antes de comenzar el partido. No asumir que `score` es `null`.

---

# 3. Formaciones

`lineups` es un array. Puede estar vacío antes de que las formaciones sean publicadas.

```ts
type MatchLineup = {
  teamId: string;
  teamName: string;
  formation: string | null;
  coach: string | null;
  kitColors: {
    player: {
      border: string;
      number: string;
      primary: string;
    };
    goalkeeper: {
      border: string;
      number: string;
      primary: string;
    };
  } | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};
```

```ts
type LineupPlayer = {
  id: string;
  name: string;
  number: string | number;
  pos: string | null;
  grid?: string | null;
};
```

Reglas:

- Si `lineups` está vacío, no mostrar una formación falsa.
- Mostrar un estado informativo indicando que las formaciones todavía no están disponibles.
- Si solamente existe la formación de un equipo, mostrarla de forma parcial.
- La llegada de las formaciones mediante socket debe reemplazar el estado vacío sin recargar toda la página manualmente.

---

# 4. Estadísticas

`stats` es un array de estadísticas por equipo.

```ts
type TeamStats = {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  statistics: MatchStatistics;
};
```

```ts
type MatchStatistics = {
  fouls: number | null;
  offsides: number | null;
  "passes_%": string | null;
  red_cards: number | null;
  total_shots: number | null;
  corner_kicks: number | null;
  total_passes: number | null;
  yellow_cards: number | null;
  blocked_shots: number | null;
  shots_on_goal: number | null;
  expected_goals: string | null;
  shots_off_goal: number | null;
  ball_possession: string | null;
  goals_prevented: string | null;
  passes_accurate: number | null;
  shots_insidebox: number | null;
  goalkeeper_saves: number | null;
  shots_outsidebox: number | null;
};
```

Reglas:

- No convertir valores faltantes en datos inventados.
- Un valor `null` debe representarse como información no disponible.
- No asumir que todas las estadísticas existen.
- Las estadísticas pueden llegar vacías durante los primeros minutos.
- Durante un partido en vivo, las estadísticas pueden actualizarse varias veces.

---

# 5. Eventos del partido

```ts
type MatchEvent = {
  id: string;
  minute: number;
  extraMinute: number | null;
  type: "Goal" | "Card" | "subst" | "Var" | string;
  detail: string;
  team: EventTeam | null;
  player: EventPlayer | null;
  assist: EventPlayer | null;
  substitutionLog: {
    playerIn: string;
    playerOut: string;
  } | null;
};
```

```ts
type EventTeam = {
  id: string;
  name: string;
  logo_url: string | null;
};

type EventPlayer = {
  id: string;
  name: string;
  photo: string | null;
};
```

Reglas:

- Los eventos deben ordenarse cronológicamente.
- Los eventos nuevos no deben duplicarse.
- Un evento puede no tener equipo, jugador o asistente.
- Una sustitución puede utilizar `substitutionLog`.
- Un gol debe actualizar también el resultado cuando llegue una actualización de score.
- Si no existen eventos, mostrar un estado vacío contextual, no una lista vacía sin explicación.

---

# 6. Estados del partido

La interfaz debe soportar como mínimo estos estados:

## No iniciado

Estados posibles:

- `TBD`
- `NS`
- `SCHEDULED`

Comportamiento:

- Mostrar fecha y hora programada.
- Mostrar equipos.
- Mostrar el resultado como pendiente.
- Solicitar información de pre-partido.
- Mostrar historial, forma y tablas si la petición fue exitosa.
- Mostrar formaciones únicamente si ya están disponibles.
- No mostrar estadísticas live.
- No mostrar cronología de eventos como si el partido hubiera comenzado.
- El chat debe permanecer deshabilitado salvo que el contrato indique explícitamente que está activo.

## En vivo

Estados posibles:

- `1H`
- `HT`
- `2H`
- `ET`
- `BT`
- `P`
- `LIVE`

Comportamiento:

- Mostrar el resultado actual.
- Mostrar el minuto si existe.
- Mostrar estadísticas disponibles.
- Mostrar eventos acumulados.
- Mostrar formaciones si existen.
- Activar el chat únicamente cuando `chatActive` sea `true`.
- Mostrar una señal clara de que el partido está en vivo.
- Actualizar resultado, minuto, estadísticas y eventos sin perder información previa.

## Penales

Estado:

- `PEN`

Comportamiento:

- Mostrar el partido como finalizado o en definición según el contrato recibido.
- Mostrar resultado regular y penales si existen.
- No asumir que `home_penalties` y `away_penalties` siempre tienen valor.
- Mantener visible la información relevante del resultado.
- El chat debe depender de `chatActive`.

## Finalizado

Estados posibles:

- `FT`
- `AET`

Comportamiento:

- Mostrar resultado final.
- Mostrar eventos completos.
- Mostrar estadísticas finales si existen.
- Mostrar formaciones.
- No solicitar actualizaciones live.
- Deshabilitar el envío de mensajes si `chatActive` es `false`.

## Suspendido, cancelado o abandonado

Estados posibles:

- `SUSP`
- `PST`
- `CANC`
- `ABD`

Comportamiento:

- Mostrar claramente que el partido no continúa con normalidad.
- No mostrarlo como live.
- No activar funcionalidades live.
- Mostrar la información disponible sin inventar una fecha nueva.
- Si no hay suficiente información, mostrar un estado de partido no disponible.

---

# 7. Reglas derivadas de estado

No depender solamente de `isLive`, porque el estado textual también es necesario para representar partidos suspendidos, cancelados o finalizados.

```ts
const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

const NOT_STARTED_STATUSES = ["TBD", "NS", "SCHEDULED"];

const FINISHED_STATUSES = ["FT", "AET", "PEN"];

const INTERRUPTED_STATUSES = ["SUSP", "PST", "CANC", "ABD"];

const isLive = LIVE_STATUSES.includes(metadata.status);
const isNotStarted = NOT_STARTED_STATUSES.includes(metadata.status);
const isFinished = FINISHED_STATUSES.includes(metadata.status);
const isInterrupted = INTERRUPTED_STATUSES.includes(metadata.status);
```

Prioridad recomendada:

1. Loading.
2. Error fatal.
3. Estado suspendido/cancelado.
4. Partido no iniciado.
5. Partido en vivo.
6. Partido finalizado.

---

# 8. Actualizaciones WebSocket

Al entrar a la página se debe emitir:

```ts
socket.emit("join_match", { matchId });
```

Al salir de la página se debe abandonar la sala:

```ts
socket.emit("leave_match", { matchId });
```

## stats_updated

Payload:

```ts
{
  matchId: string;
  stats: TeamStats[];
}
```

Comportamiento:

- Reemplazar las estadísticas anteriores por `payload.stats`.
- No modificar score, eventos ni formaciones.
- Mostrar los nuevos valores sin perder el resto del partido.

## timeline_updated

Payload:

```ts
{
  matchId: string;
  lastEvent: MatchEvent | null;
  totalEvents: number;
}
```

Comportamiento:

- Si `lastEvent` es `null`, no modificar la lista.
- Si el evento ya existe, no duplicarlo.
- Si es nuevo, agregarlo a `events`.
- Mantener el orden cronológico.
- No asumir que todos los campos opcionales están presentes.

## lineups_updated

Puede provocar que se vuelva a consultar el detalle completo del partido.

Comportamiento:

- Actualizar las formaciones.
- Mantener el resto de los datos existentes.
- No mostrar un loading de página completa.

## match_live_update

Payload:

```ts
{
  matchId: string;
  type: "SCORE_UPDATED" | "MINUTE_TICK";
  h: number;
  a: number;
  status: string;
  elapsed: number | null;
}
```

Comportamiento:

- Actualizar resultado local.
- Actualizar estado del partido.
- Actualizar minuto transcurrido.
- Si el estado cambia de `NS` a live, cambiar inmediatamente el modo de la página.
- Si el estado cambia a `FT`, `AET` o `PEN`, cambiar a modo finalizado.

## match_data_update

Puede recibirse como evento general de actualización.

El componente puede usarlo para invalidar o refrescar la consulta principal, pero debe evitar reemplazar datos válidos con `undefined`.

---

# 9. Chat

El backend puede emitir:

```ts
match_chat_history
on-message
on_message_deleted
```

## Historial

```ts
type ChatMessage = {
  messageId: string;
  matchId: string;
  userId: string;
  name: string;
  teamName: string | null;
  badgeUrl: string | null;
  message: string;
  timestamp: number;
  stickerId?: string | null;
  nameColor?: string | null;
  isMegaphone?: boolean;
};
```

Reglas:

- Mostrar el historial recibido al entrar a la sala.
- Agregar mensajes nuevos al final.
- Eliminar mensajes cuando llegue `on_message_deleted`.
- No habilitar el chat solo porque la página tenga conexión WebSocket.
- Usar `chatActive` como fuente principal para saber si se puede participar.
- Si el usuario no puede escribir, mostrar el chat en modo lectura o un mensaje contextual.

---

# 10. Información pre-match

```ts
type PreMatchResponse = {
  history: {
    homeWins: number;
    awayWins: number;
    draws: number;
    total: number;
    lastMatches: MatchHistoryItem[];
  };
  form: {
    home: string;
    away: string;
  };
  miniTable: {
    tournament: {
      home: TableEntry[];
      away: TableEntry[];
    };
    annual: {
      home: TableEntry[];
      away: TableEntry[];
    };
    averages: {
      home: TableEntry[];
      away: TableEntry[];
    };
  };
};
```

Reglas:

- Esta información se muestra solamente cuando el partido todavía no comenzó.
- Cada bloque debe tener loading, empty y error state.
- Si falla el pre-match, la página principal del partido debe seguir funcionando.
- No tratar un error del pre-match como un error fatal del detalle principal.

---

# 11. Estados de carga y error

## Carga inicial

Mientras se solicita el detalle:

- Mostrar una estructura de carga completa.
- No mostrar valores ficticios como nombres o resultados.
- Evitar que la página salte de tamaño de forma excesiva.

## Error del detalle principal

Si falla la petición principal:

- Mostrar un estado de error claro.
- Permitir reintentar.
- Si el partido no existe, mostrar estado de recurso no encontrado.

## Error de pre-match

- Mantener visible el partido.
- Mostrar el resto de la página.
- Mostrar el bloque pre-match en estado de error con opción de reintentar.

## WebSocket desconectado

- Mantener los últimos datos conocidos.
- No borrar estadísticas, eventos ni resultado.
- Mostrar un indicador de conexión perdida.
- Reintentar la conexión mediante la estrategia existente del proyecto.
- Cuando se reconecte, volver a unirse a la sala y refrescar los datos.

## Datos incompletos

La interfaz debe tolerar:

- Venue `null`.
- Logo `null`.
- Estadísticas vacías.
- Eventos vacíos.
- Formaciones vacías.
- Jugador `null`.
- Equipo de evento `null`.
- Valores estadísticos `null`.

Nunca inventar datos para completar la interfaz.

---

# 12. Mocks obligatorios

Crear mocks independientes para probar al menos estos escenarios:

1. Partido no iniciado sin formaciones.
2. Partido no iniciado con formaciones y pre-match completo.
3. Partido en vivo en primer tiempo.
4. Partido en descanso (`HT`).
5. Partido en vivo con goles, tarjetas y sustituciones.
6. Partido con estadísticas incompletas.
7. Partido finalizado (`FT`).
8. Partido finalizado después de tiempo extra (`AET`).
9. Partido en penales (`PEN`).
10. Partido suspendido (`SUSP`).
11. Partido cancelado (`CANC`).
12. Partido sin eventos.
13. Error del detalle principal.
14. Error únicamente del pre-match.
15. WebSocket desconectado.
16. Recepción de un evento duplicado.
17. Recepción de una actualización de estadísticas.
18. Cambio de estado de `NS` a `1H`.
19. Cambio de estado de `2H` a `FT`.
20. Chat activo.
21. Chat inactivo.
22. Historial de chat vacío.
23. Eliminación de un mensaje del chat.

Los mocks deben permitir cambiar de estado durante la ejecución para comprobar que la UI reacciona correctamente.

---

# 13. Criterios de aceptación

La implementación se considera correcta cuando:

- La página funciona con todos los estados definidos.
- No aparecen secciones live en partidos no iniciados.
- Un partido live actualiza score, minuto, estadísticas y eventos.
- Los eventos no se duplican.
- La llegada de formaciones actualiza la interfaz.
- Un error del pre-match no rompe el detalle principal.
- Una desconexión WebSocket conserva los últimos datos.
- El cambio a estado finalizado desactiva correctamente las actualizaciones live.
- El chat respeta `chatActive`.
- La interfaz no depende de que todos los campos estén completos.
- Todos los escenarios pueden probarse usando mocks.
- No se inventan endpoints, payloads ni campos que no estén incluidos en esta especificación.

---

