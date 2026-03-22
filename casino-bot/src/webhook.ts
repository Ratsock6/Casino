import express from 'express';
import { client } from './index';
import { applyDiscordProfile } from './utils';

const app = express();
app.use(express.json());

const SECRET = process.env.CASINO_BOT_SECRET;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

app.post('/linked', async (req, res) => {
  if (req.body.secret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { discordId, firstName, lastName, phoneNumber, role } = req.body;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await applyDiscordProfile(guild, discordId, role, firstName, lastName, phoneNumber);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export const startWebhook = () => {
  const port = process.env.BOT_WEBHOOK_PORT || 3001;
  app.listen(port, () => {
    console.log(`🔗 Webhook bot en écoute sur le port ${port}`);
  });
};