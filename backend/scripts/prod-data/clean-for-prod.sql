-- Reduce una COPIA de la base de dev al contenido inicial de producción. Lo usa export-dev-to-prod.sh.
-- Nunca correr contra la base de dev real: borra usuarios y datos.
--
-- Se conserva (todo lo que no figura abajo como borrado):
--   * Fútbol: ligas, equipos, partidos, jugadores, estadísticas, tabla de posiciones (Leagues, Teams, Matches...).
--   * football_teams (los equipos de hinchas que elige cada usuario).
--   * Tienda: StoreItem (sin los [E2E]) y StoreDiscount.
--   * Suscripciones y monedas: subscription_plans y coin_packs (los tiers y los packs).
--   * UN usuario: el del correo :keep_email (el presidente), con su billetera, inventario y estadísticas.
--
-- Se borra: los demás usuarios, y todo lo que generan los usuarios (apuestas y mercados, encuestas y votos,
-- comentarios, notificaciones, transacciones, órdenes de monedas, pagos procesados, suscripciones contratadas,
-- reportes, tickets, anuncios y el historial de cambios de precio).
--
-- Uso: psql -v ON_ERROR_STOP=1 -v keep_email=correo@dominio.com -f clean-for-prod.sql
BEGIN;

-- Si el correo no existe, esta división falla y ON_ERROR_STOP aborta antes de borrar nada.
SELECT 1 / (SELECT count(*) FROM users WHERE email = :'keep_email') AS usuario_a_conservar_existe;

CREATE TEMP TABLE keep_user AS SELECT id FROM users WHERE email = :'keep_email';

-- Contenido generado por usuarios. Una sola sentencia: si alguna tabla fuera del grupo las referenciara,
-- Postgres se niega a truncar y el script aborta en vez de dejar datos huérfanos.
TRUNCATE TABLE
  "Bet", "MarketOption", "Market",
  "Vote", "PollReaction", "CommentReaction", comments, "Poll",
  "CoinTransaction", coin_orders, processed_payments, user_subscriptions,
  "Notification", "GlobalAnnouncementRead", "GlobalAnnouncement",
  ticket_messages, tickets, reports,
  price_change_logs;

-- Todos los usuarios menos el que se conserva. Su billetera, inventario y estadísticas caen por ON DELETE CASCADE.
DELETE FROM users WHERE id NOT IN (SELECT id FROM keep_user);

-- Datos marcados [E2E] que no son de usuarios.
DELETE FROM "StoreItem" WHERE name LIKE '[E2E]%';

-- Sin sesiones de dev (en producción los JWT secrets son otros) ni tier sin suscripción que lo respalde.
UPDATE users SET "hashedRefreshToken" = NULL, "activeSubscriptionTier" = NULL;

-- Resumen para revisar a ojo antes de exportar.
SELECT 'users' AS tabla, count(*) FROM users
UNION ALL SELECT 'Wallet', count(*) FROM "Wallet"
UNION ALL SELECT 'UserInventory', count(*) FROM "UserInventory"
UNION ALL SELECT 'UserStats', count(*) FROM "UserStats"
UNION ALL SELECT 'StoreItem', count(*) FROM "StoreItem"
UNION ALL SELECT 'StoreDiscount', count(*) FROM "StoreDiscount"
UNION ALL SELECT 'subscription_plans', count(*) FROM subscription_plans
UNION ALL SELECT 'coin_packs', count(*) FROM coin_packs
UNION ALL SELECT 'football_teams', count(*) FROM football_teams
UNION ALL SELECT 'Leagues', count(*) FROM "Leagues"
UNION ALL SELECT 'Teams', count(*) FROM "Teams"
UNION ALL SELECT 'Matches', count(*) FROM "Matches"
UNION ALL SELECT 'Players', count(*) FROM "Players"
UNION ALL SELECT 'Market (debe ser 0)', count(*) FROM "Market"
UNION ALL SELECT 'CoinTransaction (debe ser 0)', count(*) FROM "CoinTransaction";

COMMIT;
