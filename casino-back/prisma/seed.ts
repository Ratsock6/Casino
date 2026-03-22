import "dotenv/config";
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });

const configs = [
  { key: 'ENABLE_PLAYER_STATS', value: 'true' },
  { key: 'ENABLE_PUBLIC_STATS', value: 'true' },
  { key: 'MAINTENANCE_GLOBAL', value: 'false' },
  { key: 'MAINTENANCE_SLOTS', value: 'false' },
  { key: 'MAINTENANCE_ROULETTE', value: 'false' },
  { key: 'MAINTENANCE_BLACKJACK', value: 'false' },
  { key: 'ALERT_HIGH_BET_THRESHOLD', value: '25000' },
  { key: 'ALERT_CONSECUTIVE_LOSSES', value: '5' },
  { key: 'ALERT_CONSECUTIVE_WINS', value: '5' },
  { key: 'ALERT_CASINO_BALANCE_MIN', value: '500000' },
  { key: 'DISCORD_WEBHOOK_URL', value: '' },
  { key: 'DISCORD_BOT_WEBHOOK_URL', value: 'http://localhost:3001' },
  { key: 'VIP_PRICE_1_MONTH', value: '50000' },
  { key: 'VIP_PRICE_3_MONTHS', value: '120000' },
  { key: 'VIP_PRICE_6_MONTHS', value: '200000' },
  { key: 'VIP_PRICE_LIFETIME', value: '500000' },
  { key: 'REPORT_DAILY_HOUR', value: '8' },
];

async function main() {
  await client.connect();

  for (const config of configs) {
    await client.query(`
      INSERT INTO "CasinoConfig" (id, key, value, "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, NOW())
      ON CONFLICT (key) DO NOTHING
    `, [config.key, config.value]);
  }

  console.log(`✅ ${configs.length} configurations insérées/vérifiées`);
  await client.end();
}

main().catch(console.error);