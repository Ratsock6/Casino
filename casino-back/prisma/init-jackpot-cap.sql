-- Initialise le plafond du plancher de jackpot (anti-emballement).
-- Le plancher de reset = min( max(JACKPOT_MIN_AMOUNT, 2% du revenu net), JACKPOT_MIN_CAP ).
-- Défaut : 500 000 jetons. Ajuste selon ce que tu veux offrir au maximum par cycle.

INSERT INTO "CasinoConfig" ("id", "key", "value", "updatedAt")
VALUES (gen_random_uuid()::text, 'JACKPOT_MIN_CAP', '500000', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Vérification :
-- SELECT * FROM "CasinoConfig" WHERE key LIKE 'JACKPOT%';
