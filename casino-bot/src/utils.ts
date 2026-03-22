import { Guild, GuildMember } from 'discord.js';

const ROLE_MAP: Record<string, string | undefined> = {
  PLAYER: process.env.DISCORD_ROLE_PLAYER,
  VIP: process.env.DISCORD_ROLE_VIP,
  ADMIN: process.env.DISCORD_ROLE_ADMIN,
  SUPER_ADMIN: process.env.DISCORD_ROLE_ADMIN,
};

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
    const rolesToRemove = Object.values(ROLE_MAP).filter(Boolean) as string[];
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
    const specificRoleId = ROLE_MAP[role];
    if (specificRoleId && specificRoleId !== playerRoleId) {
      await member.roles.add(specificRoleId).catch(console.error);
    }

    console.log(`✅ Profil Discord mis à jour : ${nickname} (PLAYER + ${role})`);
  } catch (err) {
    console.error('Erreur applyDiscordProfile:', err);
  }
};