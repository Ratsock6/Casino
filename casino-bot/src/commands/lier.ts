import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { generateLinkCode } from '../api';

export const data = new SlashCommandBuilder()
  .setName('lier')
  .setDescription('Lier ton compte Discord au Bellagio Casino');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  try {
    console.log('Génération du code pour:', interaction.user.id, interaction.user.tag);
    console.log('API URL:', process.env.CASINO_API_URL);
    console.log('Secret:', process.env.CASINO_BOT_SECRET);

    const result = await generateLinkCode(
      interaction.user.id,
      interaction.user.tag,
    );

    console.log('Résultat:', result);
    const embed = new EmbedBuilder()
      .setTitle('🎰 Bellagio Casino — Liaison de compte')
      .setColor(0xC9A84C)
      .setDescription([
        'Pour lier ton compte Discord à ton compte casino :',
        '',
        '**1.** Connecte-toi sur le site du casino',
        '**2.** Va dans **Mon Profil → Compte**',
        '**3.** Clique sur **Lier Discord** et entre ce code :',
        '',
        `## \`${result.code}\``,
        '',
        '⏳ Ce code expire dans **10 minutes**.',
      ].join('\n'))
      .setFooter({ text: 'Bellagio Casino — Code à usage unique' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    const message = err.response?.data?.message || 'Une erreur est survenue.';
    await interaction.editReply(`❌ ${message}`);
  }
};