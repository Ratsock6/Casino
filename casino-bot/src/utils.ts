import {
  Guild,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';

// NB : on lit process.env via une fonction (et non un objet figé au niveau
// module) pour garantir que dotenv.config() a déjà tourné au moment de l'appel.
const getRoleMap = (): Record<string, string | undefined> => ({
  PLAYER: process.env.DISCORD_ROLE_PLAYER,
  VIP: process.env.DISCORD_ROLE_VIP,
  ADMIN: process.env.DISCORD_ROLE_ADMIN,
  SUPER_ADMIN: process.env.DISCORD_ROLE_ADMIN,
});

// Formate le pseudo : "00228 | Diego Guerrero"
export const formatNickname = (phoneNumber: string, firstName: string, lastName: string): string => {
  const prefix = phoneNumber.split('-')[0]; // "00228"
  return `${prefix} | ${firstName} ${lastName}`;
};

// Applique le rôle et le pseudo sur Discord
export const applyDiscordProfile = async (
  guild: Guild,
  discordId: string,
  role: string,
  firstName: string,
  lastName: string,
  phoneNumber: string,
): Promise<void> => {
  try {
    const member = await guild.members.fetch(discordId);
    const nickname = formatNickname(phoneNumber, firstName, lastName);

    // Change le pseudo
    await member.setNickname(nickname).catch(() => {
      console.log('Impossible de changer le pseudo (probablement propriétaire du serveur)');
    });

    // Retire les anciens rôles casino
    const roleMap = getRoleMap();
    const rolesToRemove = Object.values(roleMap).filter(Boolean) as string[];
    for (const roleId of rolesToRemove) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId).catch(console.error);
      }
    }

    // Ajoute toujours le rôle PLAYER
    const playerRoleId = process.env.DISCORD_ROLE_PLAYER;
    if (playerRoleId) {
      await member.roles.add(playerRoleId).catch(console.error);
    }

    // Ajoute le rôle spécifique en plus si ce n'est pas PLAYER
    const specificRoleId = roleMap[role];
    if (specificRoleId && specificRoleId !== playerRoleId) {
      await member.roles.add(specificRoleId).catch(console.error);
    }

    console.log(`✅ Profil Discord mis à jour : ${nickname} (PLAYER + ${role})`);
  } catch (err) {
    console.error('Erreur applyDiscordProfile:', err);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// Helpers tickets / demandes (credit, retrait, direction)
// ─────────────────────────────────────────────────────────────────────────────

export type RequestKind = 'credit' | 'retrait';

interface CasinoUser {
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  balance: number;
  role: string;
}

// Slugifie une chaîne pour un nom de salon Discord (a-z, 0-9, tirets)
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'joueur';

// Construit la rangée de bouton "Fermer le ticket"
export const buildCloseRow = (): ActionRowBuilder<ButtonBuilder> =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Fermer le ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );

// Vérifie si un joueur a déjà un ticket ouvert d'un type donné (par préfixe de nom).
// Renvoie le salon existant ou null.
export const findExistingTicket = (
  guild: Guild,
  prefix: string,
  discordId: string,
): TextChannel | null => {
  const existing = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.name.startsWith(`${prefix}-`) &&
      (c as TextChannel).topic === discordId,
  );
  return (existing as TextChannel) || null;
};

// Crée un salon privé de demande (credit/retrait) avec récap + bouton fermer.
// Réutilisé par les slash-commands /credit, /retrait ET par le panneau de tickets.
export const createRequestChannel = async (
  guild: Guild,
  discordId: string,
  user: CasinoUser,
  kind: RequestKind,
  montant: number,
): Promise<TextChannel> => {
  const isCredit = kind === 'credit';
  const prefix = isCredit ? 'credit' : 'retrait';
  const label = isCredit ? 'crédit' : 'retrait';

  const categoryId = isCredit
    ? process.env.DISCORD_CREDIT_CATEGORY_ID
    : process.env.DISCORD_RETRAIT_CATEGORY_ID;
  const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID;

  const channelName = `${prefix}-${slugify(user.username)}-${Date.now()
    .toString()
    .slice(-4)}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    // On stocke le discordId de l'auteur dans le topic pour l'anti-doublon
    topic: discordId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: discordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      ...(staffRoleId
        ? [
            {
              id: staffRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
              ],
            },
          ]
        : []),
    ],
  });

  const resumeEmbed = new EmbedBuilder()
    .setTitle(`💸 Demande de ${label} — Bellagio Casino`)
    .setColor(0xc9a84c)
    .setDescription(
      `Bonjour <@${discordId}> ! Un membre du staff va prendre en charge votre demande de ${label}. Merci de patienter.`,
    )
    .addFields(
      { name: '👤 Nom complet', value: `**${user.firstName} ${user.lastName}**`, inline: true },
      { name: '🎮 Pseudo casino', value: `**${user.username}**`, inline: true },
      { name: '📞 Téléphone RP', value: `**${user.phoneNumber}**`, inline: true },
      { name: '💰 Montant demandé', value: `**${montant.toLocaleString()} jetons**`, inline: true },
      { name: '🪙 Solde actuel', value: `**${user.balance.toLocaleString()} jetons**`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: '📋 Instructions',
        value: [
          '• Un membre du staff vous contactera pour fixer le rendez-vous',
        ].join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: 'Bellagio Casino — Ne partagez jamais vos identifiants' })
    .setTimestamp();

  const staffMention = staffRoleId ? `<@&${staffRoleId}>` : '@staff';

  await channel.send({
    content: `${staffMention} — Nouvelle demande de ${label} de <@${discordId}>`,
    embeds: [resumeEmbed],
    components: [buildCloseRow()],
  });

  return channel as TextChannel;
};

// Crée un salon "Contacter la direction" avec le motif fourni.
export const createDirectionChannel = async (
  guild: Guild,
  discordId: string,
  displayName: string,
  motif: string,
): Promise<TextChannel> => {
  const categoryId =
    process.env.DISCORD_DIRECTION_CATEGORY_ID || process.env.DISCORD_CREDIT_CATEGORY_ID;
  const directionRoleId =
    process.env.DISCORD_DIRECTION_ROLE_ID || process.env.DISCORD_STAFF_ROLE_ID;

  const channelName = `direction-${slugify(displayName)}-${Date.now().toString().slice(-4)}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    topic: discordId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: discordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      ...(directionRoleId
        ? [
            {
              id: directionRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
              ],
            },
          ]
        : []),
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle('📞 Contact direction — Bellagio Casino')
    .setColor(0xe05c5c)
    .setDescription(
      `Bonjour <@${discordId}> ! Votre demande a bien été transmise à la direction. Un responsable vous répondra ici dès que possible.`,
    )
    .addFields({ name: '📝 Motif du contact', value: motif.slice(0, 1024), inline: false })
    .setFooter({ text: 'Bellagio Casino — Direction' })
    .setTimestamp();

  const mention = directionRoleId ? `<@&${directionRoleId}>` : '@direction';

  await channel.send({
    content: `${mention} — Nouveau contact de <@${discordId}>`,
    embeds: [embed],
    components: [buildCloseRow()],
  });

  return channel as TextChannel;
};

// Vérifie si un membre fait partie du staff (rôle DISCORD_STAFF_ROLE_ID)
// ou possède la permission ManageChannels / Administrator.
export const isStaffMember = (interaction: {
  member: any;
  memberPermissions?: any;
}): boolean => {
  const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID;
  const member = interaction.member;

  // Permission ManageChannels ou Administrator = staff de fait
  const perms = interaction.memberPermissions;
  if (perms?.has?.(PermissionFlagsBits.ManageChannels)) return true;
  if (perms?.has?.(PermissionFlagsBits.Administrator)) return true;

  // Sinon, présence du rôle staff configuré
  if (staffRoleId && member?.roles?.cache?.has?.(staffRoleId)) return true;

  return false;
};