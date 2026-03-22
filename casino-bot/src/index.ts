import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import * as lier from './commands/lier';
import * as solde from './commands/solde';
import * as retrait from './commands/retrait';
import { startWebhook } from './webhook';
dotenv.config();

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = new Collection<string, any>();
commands.set('lier', { data: lier.data, execute: lier.execute });
commands.set('solde', { data: solde.data, execute: solde.execute });
commands.set('retrait', { data: retrait.data, execute: retrait.execute });

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
  startWebhook();
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