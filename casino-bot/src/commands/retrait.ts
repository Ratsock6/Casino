import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { getUserByDiscordId } from '../api';

export const data = new SlashCommandBuilder()
  .setName('retrait')
  .setDescription('Demander un retrait de jetons au Bellagio Casino')
  .addIntegerOption((option) =>
    option
      .setName('montant')
      .setDescription('Montant de jetons à retirer')
      .setRequired(true)
      .setMinValue(1)
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  try {
    const user = await getUserByDiscordId(interaction.user.id);
    const montant = interaction.options.getInteger('montant', true);

    if (montant > user.balance) {
      await interaction.editReply(
        `❌ Solde insuffisant. Votre solde actuel : **${user.balance.toLocaleString()} jetons**.`
      );
      return;
    }

    // Récupère la catégorie depuis le .env
    const categoryId = process.env.DISCORD_RETRAIT_CATEGORY_ID;
    const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID;

    if (!interaction.guild) {
      await interaction.editReply('❌ Cette commande doit être utilisée dans un serveur Discord.');
      return;
    }

    // Crée le channel privé
    const channelName = `retrait-${user.username.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites: [
        {
          // @everyone ne peut pas voir
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          // Le joueur peut voir et écrire
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...(staffRoleId ? [{
          // Le staff peut voir et écrire
          id: staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        }] : []),
      ],
    });

    // Envoie le résumé dans le channel
    const resumeEmbed = new EmbedBuilder()
      .setTitle('💸 Demande de retrait — Bellagio Casino')
      .setColor(0xC9A84C)
      .setDescription(`Bonjour <@${interaction.user.id}> ! Un membre du staff va prendre en charge votre demande de retrait. Merci de patienter.`)
      .addFields(
        { name: '👤 Nom complet', value: `**${user.firstName} ${user.lastName}**`, inline: true },
        { name: '🎮 Pseudo casino', value: `**${user.username}**`, inline: true },
        { name: '📞 Téléphone RP', value: `**${user.phoneNumber}**`, inline: true },
        { name: '💰 Montant demandé', value: `**${montant.toLocaleString()} jetons**`, inline: true },
        { name: '🪙 Solde actuel', value: `**${user.balance.toLocaleString()} jetons**`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        {
          name: '📋 Instructions', value: [
            '• Munissez-vous de votre **carte d\'identité RP**',
            '• Le retrait se fait **en jeu, en safe zone**',
            '• Un membre du staff vous contactera pour fixer le rendez-vous',
          ].join('\n'), inline: false
        },
      )
      .setFooter({ text: 'Bellagio Casino — Ne partagez jamais vos identifiants' })
      .setTimestamp();

    // Mention du staff si rôle configuré
    const staffMention = staffRoleId ? `<@&${staffRoleId}>` : '@staff';

    await channel.send({
      content: `${staffMention} — Nouvelle demande de retrait de <@${interaction.user.id}>`,
      embeds: [resumeEmbed],
    });

    // Répond au joueur
    await interaction.editReply(
      `✅ Votre demande a été créée ! Rendez-vous dans <#${channel.id}> pour la suite.`
    );

  } catch (err: any) {
    console.error('Erreur retrait:', err);
    if (err.response?.status === 404) {
      await interaction.editReply(
        '❌ Aucun compte casino lié à ton Discord.\nUtilise `/lier` pour connecter ton compte !'
      );
    } else {
      await interaction.editReply('❌ Une erreur est survenue : ' + (err.response?.data?.message || err.message));
    }
  }
};