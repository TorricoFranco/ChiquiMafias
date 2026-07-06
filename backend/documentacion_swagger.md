# Reporte de Estado - Documentación Swagger Ultra League

| Controlador | Método | Ruta | Estado | Seguridad | Observaciones / Info Faltante |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Configuración** | N/A | `/api` | ✅ Completado | N/A | DocumentBuilder y Plugin configurados |
| **Polls** | POST | `/polls` | ⏳ Pendiente | 🔑 ADMIN | Verificar si requiere CreatePollDto |
| **Polls** | GET | `/polls/active` | ⏳ Pendiente | 🌐 Público | |
| **Matches** | GET | `/matches/leagues/:leagueId/seasons/:season/matches/:matchId` | ✅ Documentado | 🌐 Público | Tipo de retorno no documentado |
| **Matches** | GET | `/matches/:matchId/events` | ✅ Documentado | 🌐 Público | Tipo de retorno no documentado |
| **Matches** | GET | `/matches/pre-match/:matchId` | ✅ Documentado | 🌐 Público | Tipo de retorno no documentado |