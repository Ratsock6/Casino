import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getLinkedUsers } from '../api';
import { applyDiscordProfile } from '../utils';

export const data = new SlashCommandBuilder()
  .setName('sync')
  .setDescription('Synchroniser les rôles et pseudos de tous les joueurs liés')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  try {
    await interaction.editReply('🔄 Synchronisation en cours...');

    const guild = interaction.guild!;
    const users = await getLinkedUsers();

    let success = 0;
    let errors = 0;

    for (const user of users) {
      if (!user.discordId) continue;
      try {
        await applyDiscordProfile(
          guild,
          user.discordId,
          user.role,
          user.firstName,
          user.lastName,
          user.phoneNumber,
        );
        success++;
      } catch {
        errors++;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Synchronisation terminée')
      .setColor(0x4CAF7D)
      .addFields(
        { name: '👥 Total traités', value: `**${users.length}**`, inline: true },
        { name: '✅ Succès', value: `**${success}**`, inline: true },
        { name: '❌ Erreurs', value: `**${errors}**`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (err: any) {
    console.error('Erreur sync:', err);
    await interaction.editReply('❌ Une erreur est survenue lors de la synchronisation.');
  }
};