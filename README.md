# 🎰 Bellagio Casino

Plateforme de casino en ligne fictif développée pour un serveur GTA RP. Les joueurs misent des **jetons virtuels** (aucun argent réel). Le casino propose trois jeux : Machines à sous, Roulette européenne et Blackjack.

🌐 **Production** : [https://casino.ratsock.fr](https://casino.ratsock.fr)

---

## ✨ Fonctionnalités principales

### Joueurs
- Inscription avec numéro de téléphone RP unique
- Acceptation du règlement obligatoire
- Système de jetons virtuels (dépôt via virement RP)
- **3 jeux** : Machines à sous, Roulette européenne, Blackjack
- Dashboard personnel (profil, transactions, parties, statistiques, historique connexions)
- Notifications en temps réel (Socket.io)

### Jeux
- **Slots** : 5 symboles, multiplicateurs jusqu'à x20, spins en rafale (max 10), animation de défilement
- **Roulette** : Tous les paris (Straight, Split, Street, Corner, Six Line, extérieurs), roue animée
- **Blackjack** : Hit, Stand, Blackjack naturel x2.5, reprise de partie en cours

### Administration
- Dashboard admin complet avec onglets dédiés
- KPIs globaux + graphiques d'évolution (Recharts)
- Leaderboard (balance, gains, parties)
- Gestion des joueurs (crédit, débit, statut, rôle)
- Historique des transactions et des parties
- Export CSV
- Logs d'audit
- Système d'alertes (Discord webhook + temps réel)
- Configuration dynamique (maintenance par jeu, seuils d'alertes...)
- Socket.io — notifications temps réel

---

## 🏗️ Architecture du projet

```
casino/
├── casino-back/          # Backend NestJS
│   ├── src/
│   │   ├── auth/         # Authentification JWT
│   │   ├── bet/          # Service central des mises
│   │   ├── blackjack/    # Jeu Blackjack
│   │   ├── slots/        # Jeu Machines à sous
│   │   ├── roulette/     # Jeu Roulette
│   │   ├── wallet/       # Gestion des wallets
│   │   ├── admin/        # Dashboard admin
│   │   ├── alerts/       # Système d'alertes
│   │   ├── casino-config/# Configuration dynamique
│   │   ├── gateway/      # Socket.io WebSocket
│   │   ├── public/       # Endpoints publics
│   │   └── prisma/       # ORM Prisma
│   └── prisma/
│       └── schema.prisma
│
└── casino-front/         # Frontend React
    └── src/
        ├── api/          # Appels HTTP
        ├── components/   # Composants réutilisables
        ├── hooks/        # Hooks personnalisés
        ├── pages/        # Pages de l'application
        ├── store/        # Zustand (état global)
        ├── styles/       # Sass
        ├── types/        # Types TypeScript
        └── utils/        # Utilitaires
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Base de données | PostgreSQL |
| Authentification | JWT |
| Temps réel | Socket.io |
| Frontend | React + TypeScript + Vite |
| État global | Zustand |
| Style | Sass (CSS custom) |
| Graphiques | Recharts |
| HTTP Client | Axios |

---

## ⚙️ Variables d'environnement

### Backend (`casino-back/.env`)

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/casino_db"
JWT_ACCESS_SECRET="votre_secret_access"
JWT_REFRESH_SECRET="votre_secret_refresh"
JWT_ACCESS_EXPIRES="7d"
JWT_REFRESH_EXPIRES="7d"
PORT=3000
```

### Frontend (`casino-front/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Installation et lancement en local

### Prérequis
- Node.js 20+
- PostgreSQL
- npm

### Backend

```bash
cd casino-back

# Installer les dépendances
npm install

# Créer le fichier .env (voir section Variables d'environnement)
cp .env.example .env

# Lancer les migrations Prisma
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate

# Lancer en développement
npm run start:dev
```

### Frontend

```bash
cd casino-front

# Installer les dépendances
npm install

# Créer le fichier .env
echo "VITE_API_URL=http://localhost:3000" > .env

# Lancer en développement
npm run dev
```

### Insérer les configurations par défaut en base

```sql
INSERT INTO "CasinoConfig" (id, key, value, "updatedAt") VALUES
(gen_random_uuid(), 'ENABLE_PLAYER_STATS', 'true', NOW()),
(gen_random_uuid(), 'ENABLE_PUBLIC_STATS', 'true', NOW()),
(gen_random_uuid(), 'MAINTENANCE_GLOBAL', 'false', NOW()),
(gen_random_uuid(), 'MAINTENANCE_SLOTS', 'false', NOW()),
(gen_random_uuid(), 'MAINTENANCE_ROULETTE', 'false', NOW()),
(gen_random_uuid(), 'MAINTENANCE_BLACKJACK', 'false', NOW()),
(gen_random_uuid(), 'ALERT_HIGH_BET_THRESHOLD', '25000', NOW()),
(gen_random_uuid(), 'ALERT_CONSECUTIVE_LOSSES', '5', NOW()),
(gen_random_uuid(), 'ALERT_CONSECUTIVE_WINS', '5', NOW()),
(gen_random_uuid(), 'ALERT_CASINO_BALANCE_MIN', '500000', NOW()),
(gen_random_uuid(), 'DISCORD_WEBHOOK_URL', '', NOW());
```

---

## 📡 Endpoints API

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion |

### Utilisateur
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/users/me` | Profil de l'utilisateur connecté |
| GET | `/users/me/login-history` | Historique des connexions |

### Wallet
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/wallet/me` | Solde du wallet |
| GET | `/wallet/me/history` | Historique des transactions |

### Jeux
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/slots/spin` | Lancer les slots |
| POST | `/roulette/spin` | Lancer la roulette |
| POST | `/blackjack/start` | Démarrer une partie |
| POST | `/blackjack/action` | Action (HIT/STAND) |
| GET | `/blackjack/active` | Partie en cours |
| GET | `/blackjack/:gameId` | État d'une partie |

### Parties & Stats
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/game-rounds/me` | Mes parties |
| GET | `/game-rounds/me/stats` | Mes statistiques |
| GET | `/game-rounds/me/stats/enabled` | Stats activées ? |

### Public
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/public/recent-winners` | Derniers gagnants |
| GET | `/public/stats` | Statistiques globales |
| GET | `/public/maintenance` | État de la maintenance |

### Admin
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/users` | Liste des joueurs |
| GET | `/admin/stats` | KPIs globaux |
| GET | `/admin/transactions` | Toutes les transactions |
| GET | `/admin/games` | Toutes les parties |
| GET | `/admin/leaderboard` | Classements |
| PATCH | `/admin/wallet/credit` | Créditer un joueur |
| PATCH | `/admin/wallet/debit` | Débiter un joueur |
| GET | `/admin/wallet/:userId` | Wallet d'un joueur |
| GET | `/admin/wallet/:userId/history` | Transactions d'un joueur |
| PATCH | `/admin/users/:userId/status` | Changer le statut |
| GET | `/admin/users/:userId/stats` | Stats d'un joueur |
| GET | `/admin/users/:userId/login-history` | Connexions d'un joueur |
| GET | `/admin/config` | Configuration |
| PATCH | `/admin/config/:key` | Modifier une config |
| GET | `/admin/charts/balance` | Graphique revenus |
| GET | `/admin/charts/games` | Graphique parties |
| GET | `/admin/audit-logs` | Logs d'audit |
| GET | `/admin/alerts` | Alertes système |

---

## 🖥️ Déploiement sur VPS

### Prérequis
- VPS Ubuntu 24.04 (OVH recommandé)
- Nom de domaine configuré
- Node.js 20, PM2, Nginx, PostgreSQL, Certbot installés

### Backend

```bash
cd casino-back
npm install
npm run build
npx prisma generate
npx prisma migrate deploy
pm2 start dist/src/main.js --name casino-back
pm2 save
```

### Frontend

```bash
cd casino-front
# Mettre VITE_API_URL=https://api.votre-domaine.com dans .env
npm install
npm run build
# Le dossier dist/ est servi par Nginx
```

### Nginx (`/etc/nginx/sites-available/casino`)

```nginx
server {
    server_name casino.votre-domaine.com;
    root /home/user/casino-front/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}

server {
    server_name api.votre-domaine.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### HTTPS

```bash
sudo certbot --nginx -d casino.votre-domaine.com -d api.votre-domaine.com
```

### Mise à jour

```bash
git pull
# Backend
npm run build && pm2 restart casino-back
# Frontend
npm run build
```

---

## 👥 Rôles utilisateur

| Rôle | Mise max Slots | Mise max Roulette | Mise max Blackjack |
|------|---------------|-------------------|-------------------|
| PLAYER | 20 000 🪙 | 10 000 🪙 | 10 000 🪙 |
| VIP | 100 000 🪙 | 50 000 🪙 | 50 000 🪙 |
| ADMIN | — | — | — |
| SUPER_ADMIN | — | — | — |

---

## 🔒 Sécurité

- **JWT** — authentification stateless
- **Idempotency** — protection contre le double-click et replay d'API
- **Transactions atomiques** — toutes les opérations financières sont atomiques
- **MaintenanceGuard** — blocage des jeux par configuration
- **RolesGuard** — protection des routes admin
- **Rate limiting** — protection contre les abus

---

*Bellagio Casino — Projet GTA RP — Sous la direction de Diego Guerrero*
