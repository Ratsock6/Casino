-- ──────────────────────────────────────────────────────────────────────────
-- Migration ponctuelle : convertir les anciens crédits admin en "payés".
--
-- Contexte : jusqu'à présent, tous les crédits admin étaient des ADMIN_CREDIT,
-- comptés comme monnaie OFFERTE. En réalité, ils correspondaient à des achats
-- de jetons payés par les joueurs (donc du revenu). On les requalifie en
-- ADMIN_CREDIT_PAID.
--
-- IMPORTANT : on EXCLUT les codes promo (reason commençant par "🎁 Code promo"),
-- qui eux étaient bien des cadeaux et doivent rester ADMIN_CREDIT.
--
-- À lancer UNE SEULE FOIS, APRÈS la migration Prisma qui ajoute la valeur
-- d'enum ADMIN_CREDIT_PAID.
-- ──────────────────────────────────────────────────────────────────────────

UPDATE "WalletTransaction"
SET type = 'ADMIN_CREDIT_PAID'
WHERE type = 'ADMIN_CREDIT'
  AND (reason IS NULL OR reason NOT LIKE '🎁 Code promo%');

-- Vérification (optionnelle) : compter ce qui reste par type
-- SELECT type, COUNT(*), SUM(amount) FROM "WalletTransaction"
-- WHERE type IN ('ADMIN_CREDIT','ADMIN_CREDIT_PAID') GROUP BY type;
