import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import * as lier from './commands/lier';
import * as solde from './commands/solde';
import * as retrait from './commands/retrait';
import * as sync from './commands/sync';
import * as credit from './commands/credit';
import { startWebhook } from './webhook';
import { getLinkedUsers } from './api';
import { applyDiscordProfile } from './utils';
dotenv.config();

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});


const syncAllRoles = async () => {
  console.log('🔄 Synchronisation des rôles Discord...');
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const users = await getLinkedUsers();

    for (const user of users) {
      if (!user.discordId) continue;
      await applyDiscordProfile(
        guild,
        user.discordId,
        user.role,
        user.firstName,
        user.lastName,
        user.phoneNumber,
      );
      // Petite pause pour éviter le rate limit Discord
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`✅ ${users.length} rôles synchronisés`);
  } catch (err) {
    console.error('Erreur sync:', err);
  }
};

const commands = new Collection<string, any>();
commands.set('lier', { data: lier.data, execute: lier.execute });
commands.set('solde', { data: solde.data, execute: solde.execute });
commands.set('retrait', { data: retrait.data, execute: retrait.execute });
commands.set('sync', { data: sync.data, execute: sync.execute });
commands.set('credit', { data: credit.data, execute: credit.execute });

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
  startWebhook();
  syncAllRoles();
  setInterval(syncAllRoles, 60 * 60 * 1000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error('Erreur complète:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Une erreur est survenue.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);