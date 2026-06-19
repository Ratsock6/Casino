-- ──────────────────────────────────────────────────────────────────────────
-- Migration OPTIONNELLE : requalifier d'anciens débits admin en "retraits".
--
-- Contexte : avant cette mise à jour, tous les débits étaient des ADMIN_DEBIT.
-- Si certains correspondaient en réalité à des RETRAITS de jetons (joueur qui
-- reconvertit ses jetons en RP), tu peux les requalifier en ADMIN_DEBIT_WITHDRAWAL
-- pour que la "Caisse nette" soit exacte.
--
-- ⚠️  CONTRAIREMENT aux crédits, NE PAS tout convertir aveuglément : un débit
-- peut être une sanction ou une correction (qui doivent rester ADMIN_DEBIT).
-- N'exécute ce script QUE si tu es sûr que tes anciens débits étaient des retraits.
--
-- IMPORTANT : on EXCLUT les ventes VIP (reason commençant par "Achat VIP"),
-- qui sont du revenu et ne doivent PAS devenir des retraits.
--
-- À lancer APRÈS la migration Prisma qui ajoute la valeur ADMIN_DEBIT_WITHDRAWAL.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) D'abord, INSPECTE tes débits existants pour décider :
-- SELECT reason, COUNT(*), SUM(amount) FROM "WalletTransaction"
-- WHERE type = 'ADMIN_DEBIT' GROUP BY reason ORDER BY SUM(amount) DESC;

-- 2) Si tu confirmes que ces débits (hors VIP) sont des retraits, décommente :

-- UPDATE "WalletTransaction"
-- SET type = 'ADMIN_DEBIT_WITHDRAWAL'
-- WHERE type = 'ADMIN_DEBIT'
--   AND (reason IS NULL OR reason NOT LIKE 'Achat VIP%');

-- 3) Vérification après conversion :
-- SELECT type, COUNT(*), SUM(amount) FROM "WalletTransaction"
-- WHERE type IN ('ADMIN_DEBIT','ADMIN_DEBIT_WITHDRAWAL') GROUP BY type;
