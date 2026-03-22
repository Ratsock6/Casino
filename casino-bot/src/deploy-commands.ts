import { REST, Routes } from 'discord.js';
import * as lier from './commands/lier';
import * as solde from './commands/solde';
import * as retrait from './commands/retrait';
import * as sync from './commands/sync';
import * as credit from './commands/credit';
import * as dotenv from 'dotenv';
dotenv.config();

const commands = [lier.data, solde.data, retrait.data, sync.data, credit.data].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  console.log('Déploiement des commandes slash...');
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID!,
      process.env.DISCORD_GUILD_ID!,
    ),
    { body: commands },
  );
  console.log('✅ Commandes déployées !');
})();