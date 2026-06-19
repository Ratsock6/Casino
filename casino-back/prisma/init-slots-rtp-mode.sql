-- Initialise la clé de configuration du RTP des machines à sous.
-- Valeurs possibles : '91' (RTP 91%, marge ~9%) ou '85' (RTP ~85%, marge ~15%).
-- À lancer une fois (le bouton du panel admin la modifiera ensuite).
--
-- NB : le champ id est requis (Prisma le génère normalement). En SQL pur on
-- fournit une valeur ; gen_random_uuid() suffit (extension pgcrypto souvent active).

INSERT INTO "CasinoConfig" ("id", "key", "value", "updatedAt")
VALUES (gen_random_uuid()::text, 'SLOTS_RTP_MODE', '91', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Si gen_random_uuid() n'est pas disponible, remplace par une chaîne fixe, ex :
-- VALUES ('cfg_slots_rtp_mode', 'SLOTS_RTP_MODE', '91', NOW())

-- Vérification :
-- SELECT * FROM "CasinoConfig" WHERE key = 'SLOTS_RTP_MODE';

