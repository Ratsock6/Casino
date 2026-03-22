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