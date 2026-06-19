import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('API URL au démarrage:', process.env.CASINO_API_URL);

const baseURL = (process.env.CASINO_API_URL || 'http://localhost:3000').trim();

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const SECRET = process.env.CASINO_BOT_SECRET;

export const generateLinkCode = async (discordId: string, discordUsername: string) => {
  try {
    const res = await api.post('/discord/generate-code', {
      discordId,
      discordUsername,
      secret: SECRET,
    });
    return res.data;
  } catch (err: any) {
    console.error('Erreur API:', err.response?.data || err.message);
    throw err;
  }
};

export const getUserByDiscordId = async (discordId: string) => {
  try {
    const res = await api.get(`/discord/user/${discordId}`);
    return res.data;
  } catch (err: any) {
    console.error('Erreur API getUserByDiscordId:', err.response?.data || err.message);
    throw err;
  }
};

export const notifyLinked = async (data: {
  discordId: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
}) => {
  try {
    const res = await api.post('/discord/notify-linked', {
      ...data,
      secret: SECRET,
    });
    return res.data;
  } catch (err: any) {
    console.error('Erreur notifyLinked:', err.response?.data || err.message);
  }
};

export const getLinkedUsers = async () => {
  try {
    const res = await api.get('/discord/linked-users', {
      params: { secret: SECRET },
    });
    return res.data;
  } catch (err: any) {
    console.error('Erreur getLinkedUsers:', err.response?.data || err.message);
    return [];
  }
};

// Crédite un joueur en jetons PAYÉS (revenu casino) depuis un ticket Discord.
export const creditPaidByDiscord = async (data: {
  discordId: string;
  amount: number;
  adminDiscordId?: string;
  adminTag?: string;
}) => {
  const res = await api.post('/discord/credit-paid', {
    ...data,
    secret: SECRET,
  });
  return res.data;
};

// Débite un joueur en RETRAIT (jetons reconvertis en RP) depuis un ticket Discord.
export const withdrawByDiscord = async (data: {
  discordId: string;
  amount: number;
  adminDiscordId?: string;
  adminTag?: string;
}) => {
  const res = await api.post('/discord/withdraw', {
    ...data,
    secret: SECRET,
  });
  return res.data;
};