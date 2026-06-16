import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getUserByDiscordId } from '../api';
import { createRequestChannel, findExistingTicket } from '../utils';

export const data = new SlashCommandBuilder()
  .setName('credit')
  .setDescription('Demander un crédit de jetons au Bellagio Casino')
  .addIntegerOption((option) =>
    option
      .setName('montant')
      .setDescription('Montant de jetons à créditer')
      .setRequired(true)
      .setMinValue(1),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (!interaction.guild) {
      await interaction.editReply('❌ Cette commande doit être utilisée dans un serveur Discord.');
      return;
    }

    const user = await getUserByDiscordId(interaction.user.id);
    const montant = interaction.options.getInteger('montant', true);

    // Anti-doublon : un seul ticket crédit ouvert à la fois
    const existing = findExistingTicket(interaction.guild, 'credit', interaction.user.id);
    if (existing) {
      await interaction.editReply(
        `❌ Tu as déjà un ticket de crédit ouvert : <#${existing.id}>. Termine-le avant d'en ouvrir un nouveau.`,
      );
      return;
    }

    const channel = await createRequestChannel(
      interaction.guild,
      interaction.user.id,
      user,
      'credit',
      montant,
    );

    await interaction.editReply(
      `✅ Votre demande a été créée ! Rendez-vous dans <#${channel.id}> pour la suite.`,
    );
  } catch (err: any) {
    console.error('Erreur crédit:', err);
    if (err.response?.status === 404) {
      await interaction.editReply(
        '❌ Aucun compte casino lié à ton Discord.\nUtilise `/lier` pour connecter ton compte !',
      );
    } else {
      await interaction.editReply(
        '❌ Une erreur est survenue : ' + (err.response?.data?.message || err.message),
      );
    }
  }
};