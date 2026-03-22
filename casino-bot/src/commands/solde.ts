import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getUserByDiscordId } from '../api';

export const data = new SlashCommandBuilder()
  .setName('solde')
  .setDescription('Vérifier ton solde au Bellagio Casino');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  try {
    const user = await getUserByDiscordId(interaction.user.id);

    const roleColors: Record<string, number> = {
      PLAYER: 0x5CC8E0,
      VIP: 0xC9A84C,
      ADMIN: 0x4CAF7D,
      SUPER_ADMIN: 0xE05C5C,
    };

    const embed = new EmbedBuilder()
      .setTitle('🎰 Bellagio Casino — Votre solde')
      .setColor(roleColors[user.role] || 0xC9A84C)
      .addFields(
        { name: '👤 Compte casino', value: `**${user.username}**`, inline: true },
        { name: '🏅 Rôle', value: `**${user.role}**`, inline: true },
        { name: '🪙 Solde', value: `**${user.balance.toLocaleString()} jetons**`, inline: false },
      )
      .setFooter({ text: 'Bellagio Casino' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    if (err.response?.status === 404) {
      await interaction.editReply(
        '❌ Aucun compte casino lié à ton Discord.\nUtilise `/lier` pour connecter ton compte !'
      );
    } else {
      await interaction.editReply('❌ Une erreur est survenue.');
    }
  }
};