import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-liaison')
  .setDescription('Envoie le message d\'explication pour lier son compte casino')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('salon')
      .setDescription('Salon où envoyer le message (optionnel, par défaut salon actuel)')
      .setRequired(false)
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  try {
    const targetChannel = (interaction.options.getChannel('salon') || interaction.channel) as TextChannel;

    const embed = new EmbedBuilder()
      .setTitle('🎰 Bellagio Casino — Lier votre compte')
      .setColor(0xC9A84C)
      .setDescription(
        '> Bienvenue au **Bellagio Casino** !\n> Pour accéder à l\'ensemble du serveur et utiliser toutes les fonctionnalités du bot, vous devez **lier votre compte Discord à votre compte casino**.'
      )
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**📋 Comment lier votre compte ?**',
          inline: false,
        },
        {
          name: '1️⃣ Créer votre compte casino',
          value: 'Rendez-vous sur **https://casino.ratsock.fr** et inscrivez-vous avec vos informations.',
          inline: false,
        },
        {
          name: '2️⃣ Utiliser la commande /lier',
          value: 'Tapez `/lier` dans n\'importe quel salon du serveur. Le bot vous enverra un **code unique valable 10 minutes** en message privé.',
          inline: false,
        },
        {
          name: '3️⃣ Entrer le code sur le site',
          value: 'Connectez-vous sur le site → **Mon Profil** → onglet **🔗 Discord** → entrez le code reçu.',
          inline: false,
        },
        {
          name: '4️⃣ Liaison confirmée ✅',
          value: 'Votre rôle Discord sera automatiquement attribué et votre pseudo mis à jour.',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**🤖 Commandes disponibles après liaison**',
          inline: false,
        },
        {
          name: '`/solde`',
          value: 'Vérifier votre solde de jetons en temps réel',
          inline: true,
        },
        {
          name: '`/retrait [montant]`',
          value: 'Demander un retrait de jetons',
          inline: true,
        },
        {
          name: '`/credit [montant]`',
          value: 'Demander un crédit de jetons',
          inline: true,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**❓ Besoin d\'aide ?**\nContactez un membre du staff en ouvrant un ticket.',
          inline: false,
        },
      )
      .setFooter({ text: 'Bellagio Casino — Sous la direction de Diego Guerrero' })
      .setTimestamp();

    await targetChannel.send({ embeds: [embed] });
    await interaction.editReply(`✅ Message envoyé dans <#${targetChannel.id}> !`);

  } catch (err) {
    console.error('Erreur setup-liaison:', err);
    await interaction.editReply('❌ Une erreur est survenue.');
  }
};