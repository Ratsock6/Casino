import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type Interaction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { getUserByDiscordId } from '../api';
import {
  createRequestChannel,
  createDirectionChannel,
  findExistingTicket,
  isStaffMember,
} from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// customId conventions (namespace "ticket_")
//   ticket_open_credit     -> bouton panel : ouvre le modal crédit
//   ticket_open_retrait    -> bouton panel : ouvre le modal retrait
//   ticket_open_direction  -> bouton panel : ouvre le modal direction
//   ticket_modal_credit    -> soumission modal crédit
//   ticket_modal_retrait   -> soumission modal retrait
//   ticket_modal_direction -> soumission modal direction
//   ticket_close           -> bouton "Fermer le ticket" dans un salon
//   ticket_close_confirm   -> bouton de confirmation de fermeture (-> archive)
//   ticket_reopen          -> bouton staff : rouvrir un ticket archivé
//   ticket_delete          -> bouton staff : supprimer définitivement
// ─────────────────────────────────────────────────────────────────────────────

// ===== Commande /setup-tickets (admin) ======================================
export const data = new SlashCommandBuilder()
  .setName('setup-tickets')
  .setDescription("Envoie le panneau de tickets (crédit, retrait, direction)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('salon')
      .setDescription('Salon où envoyer le panneau (par défaut : salon actuel)')
      .setRequired(false),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const targetChannel = (interaction.options.getChannel('salon') ||
    interaction.channel) as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle('🎟️ Bellagio Casino — Tickets & Support')
    .setColor(0xc9a84c)
    .setDescription(
      [
        '> Besoin de gérer vos jetons ou de contacter le staff ? Ouvrez un ticket en cliquant sur le bouton correspondant ci-dessous.',
        '',
        '**💰 Crédit** — Créditer votre compte casino en jetons.',
        '**💸 Retrait** — Retirer vos jetons du casino.',
        '**📞 Contacter la direction** — Poser une question ou signaler un problème à la direction.',
        '',
        '*Un salon privé sera créé entre vous et le staff. Pour les crédits et retraits, votre compte casino doit être lié (utilisez `/lier`).*',
      ].join('\n'),
    )
    .setFooter({ text: 'Bellagio Casino — Un seul ticket de chaque type à la fois' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open_credit')
      .setLabel('Crédit')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_open_retrait')
      .setLabel('Retrait')
      .setEmoji('💸')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_open_direction')
      .setLabel('Contacter la direction')
      .setEmoji('📞')
      .setStyle(ButtonStyle.Secondary),
  );

  try {
    await targetChannel.send({ embeds: [embed], components: [row] });
    await interaction.editReply(`✅ Panneau de tickets envoyé dans <#${targetChannel.id}> !`);
  } catch (err) {
    console.error('Erreur setup-tickets:', err);
    await interaction.editReply(
      "❌ Impossible d'envoyer le panneau. Vérifie mes permissions dans ce salon.",
    );
  }
};

// ===== Modals ================================================================
const buildAmountModal = (kind: 'credit' | 'retrait'): ModalBuilder => {
  const isCredit = kind === 'credit';
  return new ModalBuilder()
    .setCustomId(`ticket_modal_${kind}`)
    .setTitle(isCredit ? 'Demande de crédit' : 'Demande de retrait')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('montant')
          .setLabel('Montant en jetons')
          .setPlaceholder('Ex : 5000')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(12),
      ),
    );
};

const buildDirectionModal = (): ModalBuilder =>
  new ModalBuilder()
    .setCustomId('ticket_modal_direction')
    .setTitle('Contacter la direction')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('motif')
          .setLabel('Expliquez votre demande')
          .setPlaceholder('Décrivez en quelques lignes la raison de votre contact...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000),
      ),
    );

// ===== Handlers de boutons (panel) ==========================================
const handleOpenButton = async (interaction: ButtonInteraction) => {
  const id = interaction.customId;

  // Direction : pas besoin de compte lié -> on ouvre directement le modal
  if (id === 'ticket_open_direction') {
    await interaction.showModal(buildDirectionModal());
    return;
  }

  // Crédit / Retrait : compte lié obligatoire. On vérifie AVANT d'ouvrir le modal.
  const kind: 'credit' | 'retrait' = id === 'ticket_open_credit' ? 'credit' : 'retrait';

  try {
    await getUserByDiscordId(interaction.user.id);
  } catch (err: any) {
    if (err.response?.status === 404) {
      await interaction.reply({
        content:
          '❌ Aucun compte casino lié à ton Discord.\nUtilise `/lier` pour connecter ton compte avant de faire une demande.',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: '❌ Impossible de vérifier ton compte pour le moment. Réessaie plus tard.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // Anti-doublon : un seul ticket de ce type ouvert à la fois
  if (interaction.guild) {
    const existing = findExistingTicket(interaction.guild, kind, interaction.user.id);
    if (existing) {
      await interaction.reply({
        content: `❌ Tu as déjà un ticket de ${kind === 'credit' ? 'crédit' : 'retrait'} ouvert : <#${existing.id}>. Termine-le avant d'en ouvrir un nouveau.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  await interaction.showModal(buildAmountModal(kind));
};

// ===== Handlers de soumission de modals =====================================
const handleAmountModal = async (
  interaction: ModalSubmitInteraction,
  kind: 'credit' | 'retrait',
) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.guild) {
    await interaction.editReply('❌ Cette action doit être effectuée dans un serveur.');
    return;
  }

  // Validation du montant
  const raw = interaction.fields.getTextInputValue('montant').trim().replace(/\s/g, '');
  const montant = Number(raw);
  if (!Number.isInteger(montant) || montant <= 0) {
    await interaction.editReply('❌ Montant invalide. Entre un nombre entier de jetons supérieur à 0.');
    return;
  }

  // Re-fetch user (et re-check anti-doublon, au cas où entre le clic et la soumission)
  let user;
  try {
    user = await getUserByDiscordId(interaction.user.id);
  } catch (err: any) {
    if (err.response?.status === 404) {
      await interaction.editReply(
        '❌ Aucun compte casino lié à ton Discord.\nUtilise `/lier` pour connecter ton compte !',
      );
    } else {
      await interaction.editReply('❌ Une erreur est survenue lors de la vérification de ton compte.');
    }
    return;
  }

  if (kind === 'retrait' && montant > user.balance) {
    await interaction.editReply(
      `❌ Solde insuffisant. Votre solde actuel : **${user.balance.toLocaleString()} jetons**.`,
    );
    return;
  }

  const existing = findExistingTicket(interaction.guild, kind, interaction.user.id);
  if (existing) {
    await interaction.editReply(
      `❌ Tu as déjà un ticket de ${kind === 'credit' ? 'crédit' : 'retrait'} ouvert : <#${existing.id}>.`,
    );
    return;
  }

  try {
    const channel = await createRequestChannel(
      interaction.guild,
      interaction.user.id,
      user,
      kind,
      montant,
    );
    await interaction.editReply(
      `✅ Votre demande a été créée ! Rendez-vous dans <#${channel.id}> pour la suite.`,
    );
  } catch (err) {
    console.error(`Erreur création ticket ${kind}:`, err);
    await interaction.editReply('❌ Impossible de créer le salon. Contacte un administrateur.');
  }
};

const handleDirectionModal = async (interaction: ModalSubmitInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.guild) {
    await interaction.editReply('❌ Cette action doit être effectuée dans un serveur.');
    return;
  }

  // Anti-doublon direction
  const existing = findExistingTicket(interaction.guild, 'direction', interaction.user.id);
  if (existing) {
    await interaction.editReply(
      `❌ Tu as déjà un ticket direction ouvert : <#${existing.id}>.`,
    );
    return;
  }

  const motif = interaction.fields.getTextInputValue('motif').trim();
  const displayName =
    interaction.member && 'displayName' in interaction.member
      ? (interaction.member as any).displayName
      : interaction.user.username;

  try {
    const channel = await createDirectionChannel(
      interaction.guild,
      interaction.user.id,
      displayName,
      motif,
    );
    await interaction.editReply(
      `✅ Votre message a été transmis ! Rendez-vous dans <#${channel.id}>.`,
    );
  } catch (err) {
    console.error('Erreur création ticket direction:', err);
    await interaction.editReply('❌ Impossible de créer le salon. Contacte un administrateur.');
  }
};

// ===== Fermeture / archivage de ticket =======================================
// Flux : 🔒 Fermer -> confirmation -> ARCHIVE (client perd l'accès, salon
// renommé "closed-…", conservé sur place) -> le staff peut Supprimer ou Rouvrir.

const handleCloseButton = async (interaction: ButtonInteraction) => {
  // N'importe qui dans le ticket peut fermer -> on demande juste confirmation.
  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close_confirm')
      .setLabel('Confirmer la fermeture')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
  await interaction.reply({
    content:
      '⚠️ Confirmez-vous la fermeture de ce ticket ?',
    components: [confirmRow],
    flags: MessageFlags.Ephemeral,
  });
};

const handleCloseConfirm = async (interaction: ButtonInteraction) => {
  const channel = interaction.channel as TextChannel;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const authorId = channel.topic || undefined; // discordId de l'auteur, stocké à la création

  try {
    // 1) Retirer l'accès de l'auteur (le client ne voit plus le salon)
    if (authorId) {
      await channel.permissionOverwrites
        .edit(authorId, {
          ViewChannel: false,
          SendMessages: false,
        })
        .catch((err) => console.error('Erreur retrait accès client:', err));
    }

    // 2) Renommer avec le préfixe closed- (si pas déjà fait)
    if (!channel.name.startsWith('closed-')) {
      await channel
        .setName(`closed-${channel.name}`.slice(0, 100))
        .catch((err) => console.error('Erreur renommage ticket:', err));
    }

    // 3) Poster l'embed de fermeture avec les actions staff
    const closedEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket fermé')
      .setColor(0x888888)
      .setDescription(
        [
          `Ce ticket a été fermé par <@${interaction.user.id}>.`,
          authorId ? `\nL'auteur (<@${authorId}>) n'a plus accès à ce salon.` : '',
          '\nLe staff peut **rouvrir** le ticket ou le **supprimer définitivement** ci-dessous.',
        ].join(''),
      )
      .setFooter({ text: 'Bellagio Casino — Tickets' })
      .setTimestamp();

    const staffRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_reopen')
        .setLabel('Rouvrir')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer définitivement')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({ embeds: [closedEmbed], components: [staffRow] });
    await interaction.editReply('✅ Ticket archivé. Le staff peut désormais le rouvrir ou le supprimer.');
  } catch (err) {
    console.error('Erreur archivage ticket:', err);
    await interaction.editReply('❌ Impossible d\'archiver le ticket. Vérifie mes permissions.');
  }
};

const handleReopen = async (interaction: ButtonInteraction) => {
  // Réservé au staff
  if (!isStaffMember(interaction)) {
    await interaction.reply({
      content: '❌ Seul le staff peut rouvrir un ticket.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel as TextChannel;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const authorId = channel.topic || undefined;

  try {
    // 1) Rendre l'accès à l'auteur
    if (authorId) {
      await channel.permissionOverwrites
        .edit(authorId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })
        .catch((err) => console.error('Erreur restauration accès client:', err));
    }

    // 2) Retirer le préfixe closed-
    if (channel.name.startsWith('closed-')) {
      await channel
        .setName(channel.name.replace(/^closed-/, ''))
        .catch((err) => console.error('Erreur renommage ticket:', err));
    }

    // 3) Désactiver les boutons du message de fermeture (évite les doubles clics)
    await interaction.message
      .edit({ components: [] })
      .catch(() => {});

    const reopenEmbed = new EmbedBuilder()
      .setColor(0x4caf7d)
      .setDescription(
        `🔓 Ticket rouvert par <@${interaction.user.id}>.${authorId ? ` <@${authorId}> a de nouveau accès.` : ''}`,
      )
      .setTimestamp();

    await channel.send({ embeds: [reopenEmbed] });
    await interaction.editReply('✅ Ticket rouvert.');
  } catch (err) {
    console.error('Erreur réouverture ticket:', err);
    await interaction.editReply('❌ Impossible de rouvrir le ticket.');
  }
};

const handleDelete = async (interaction: ButtonInteraction) => {
  // Réservé au staff
  if (!isStaffMember(interaction)) {
    await interaction.reply({
      content: '❌ Seul le staff peut supprimer un ticket.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel as TextChannel;
  await interaction.reply({
    content: `🗑️ Suppression définitive du salon dans 5 secondes (demandée par <@${interaction.user.id}>)...`,
  });
  setTimeout(() => {
    channel.delete().catch((err) => console.error('Erreur suppression ticket:', err));
  }, 5000);
};

// ===== Routeur principal (appelé depuis index.ts) ============================
// Renvoie true si l'interaction a été prise en charge par le système de tickets.
export const handleTicketInteraction = async (
  interaction: Interaction,
): Promise<boolean> => {
  // Boutons
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id.startsWith('ticket_open_')) {
      await handleOpenButton(interaction);
      return true;
    }
    if (id === 'ticket_close') {
      await handleCloseButton(interaction);
      return true;
    }
    if (id === 'ticket_close_confirm') {
      await handleCloseConfirm(interaction);
      return true;
    }
    if (id === 'ticket_reopen') {
      await handleReopen(interaction);
      return true;
    }
    if (id === 'ticket_delete') {
      await handleDelete(interaction);
      return true;
    }
    return false;
  }

  // Modals
  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (id === 'ticket_modal_credit') {
      await handleAmountModal(interaction, 'credit');
      return true;
    }
    if (id === 'ticket_modal_retrait') {
      await handleAmountModal(interaction, 'retrait');
      return true;
    }
    if (id === 'ticket_modal_direction') {
      await handleDirectionModal(interaction);
      return true;
    }
    return false;
  }

  return false;
};