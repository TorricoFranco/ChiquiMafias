-- Limpieza de una COPIA de la base de dev antes de llevarla a producción.
-- Nunca correr contra la base de dev real: borra usuarios. Lo usa export-dev-to-prod.sh.
BEGIN;

-- Usuarios de la suite e2e (backend/scripts/seed-e2e.ts) y todo lo que los referencia con RESTRICT.
CREATE TEMP TABLE e2e_users AS
  SELECT id FROM users WHERE email LIKE 'e2e-%@chiquimafias.test';

DELETE FROM ticket_messages
  WHERE "senderId" IN (SELECT id FROM e2e_users)
     OR "ticketId" IN (SELECT id FROM tickets WHERE "userId" IN (SELECT id FROM e2e_users));
DELETE FROM tickets WHERE "userId" IN (SELECT id FROM e2e_users);
DELETE FROM reports
  WHERE "reporterId" IN (SELECT id FROM e2e_users)
     OR "reportedId" IN (SELECT id FROM e2e_users);
DELETE FROM "Vote" WHERE "userId" IN (SELECT id FROM e2e_users);

-- El resto (Wallet, Bet, Notification, UserInventory, UserStats, suscripciones, etc.)
-- cae por ON DELETE CASCADE; los SET NULL quedan huérfanos a propósito.
DELETE FROM users WHERE id IN (SELECT id FROM e2e_users);

-- Datos marcados [E2E] que no son de usuarios.
DELETE FROM "StoreItem" WHERE name LIKE '[E2E]%';

-- Nadie arranca con una sesión de dev: los refresh tokens no sirven en prod (otro JWT_REFRESH_SECRET).
UPDATE users SET "hashedRefreshToken" = NULL;

COMMIT;
