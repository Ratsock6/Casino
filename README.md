
# 🎰 Diamond Casino Backend (FiveM RP)

Backend d’un **casino virtuel inspiré du Diamond Casino de GTA V**, conçu pour être utilisé dans un **serveur FiveM RP**.

Ce projet implémente un **système complet de jeux de casino avec jetons virtuels**, incluant l’authentification, la gestion des portefeuilles, les transactions sécurisées et plusieurs jeux.

> ⚠️ **Important :** ce projet utilise uniquement des **jetons virtuels**. Aucun argent réel n'est utilisé ou retiré.

---

# 📸 Aperçu du projet

Ce backend sert de moteur pour :

- 🎰 Machines à sous
- 🎡 Roulette européenne
- 🃏 Blackjack
- 💰 Gestion de wallet et transactions
- 🛡️ Protection anti‑triche

Conçu pour être intégré avec :

- un frontend React
- un serveur FiveM
- ou une interface admin web

---

# 🧰 Stack technique

| Technologie | Usage |
|--------------|------|
| **NestJS** | Framework backend |
| **TypeScript** | Langage principal |
| **PostgreSQL** | Base de données |
| **Prisma ORM** | Accès base de données |
| **JWT** | Authentification |
| **Idempotency System** | Protection anti‑triche |
| **Class Validator** | Validation des DTO |

---

# 🏗️ Architecture

Le système repose sur un **service centralisé de paris**.

```
Game
 ↓
BetService
 ↓
Wallet
 ↓
WalletTransaction
```

Chaque jeu :

1. place un pari (`placeBet()`)
2. exécute la logique du jeu
3. crédite ou débite le joueur (`settleWin()` / `settleLoss()`)

Avantages :

- cohérence financière
- historique complet
- audit des parties
- protection anti‑triche

---

# 👤 Rôles utilisateurs

```ts
PLAYER
VIP
ADMIN
SUPER_ADMIN
```

| Rôle | Description |
|-----|-------------|
| PLAYER | Joueur standard |
| VIP | Limites de pari plus élevées |
| ADMIN | Gestion du casino |
| SUPER_ADMIN | Accès complet |

---

# 💰 Système de Wallet

Chaque joueur possède un portefeuille.

### Wallet

| Champ | Description |
|------|-------------|
| id | identifiant |
| userId | propriétaire |
| balance | solde en jetons |
| createdAt | date création |
| updatedAt | dernière modification |

---

### WalletTransaction

Historique complet des transactions.

Types :

```
BET
WIN
LOSS
REFUND
ADMIN_CREDIT
ADMIN_DEBIT
```

Cela permet :

- audit des gains
- traçabilité
- détection d’abus

---

# 🛡️ Système anti‑triche

Protection contre :

- double requête
- double click
- replay API

Header utilisé :

```
x-idempotency-key
```

Utilisé sur :

- `/slots/spin`
- `/roulette/spin`
- `/blackjack/start`

---

# 🎯 Limites de pari

Les limites sont configurées via :

```
GameConfigService
```

Configuration exemple :

| Jeu | Standard | VIP |
|----|-----------|-----|
| Roulette | 10 000 | 50 000 |
| Slots | 20 000 | 100 000 |
| Blackjack | 10 000 | 50 000 |

---

# 🎰 Jeux disponibles

## 🎰 Slots

Machine à sous RNG simple.

### Endpoint

```
POST /slots/spin
```

### Body

```json
{
  "bet": 100
}
```

### Fonctionnement

1. validation du pari
2. RNG
3. calcul multiplicateur
4. payout via BetService

---

## 🎡 Roulette Européenne

### Endpoint

```
POST /roulette/spin
```

### Exemple de mise

```json
{
  "bets": [
    {
      "type": "straight",
      "numbers": [17],
      "amount": 100
    }
  ]
}
```

### Paris supportés

| Type |
|-----|
straight |
split |
street |
corner |
six line |
red / black |
even / odd |
low / high |
dozen |
column |

### Support du 0

```
split 0-1
split 0-2
split 0-3

street 0-1-2
street 0-2-3
```

Validation géométrique de la table incluse.

---

## 🃏 Blackjack

### Démarrer une partie

```
POST /blackjack/start
```

```json
{
  "bet": 500
}
```

---

### Actions joueur

```
POST /blackjack/action
```

```json
{
  "gameId": "...",
  "action": "HIT"
}
```

ou

```json
{
  "gameId": "...",
  "action": "STAND"
}
```

---

### Récupérer l'état de la partie

```
GET /blackjack/:gameId
```

---

### Fonctionnalités actuelles

- startGame
- hit
- stand
- blackjack naturel
- bust
- push
- dealer play
- carte cachée du dealer

---

### Fonctionnalités prévues

```
DOUBLE
SPLIT
INSURANCE
```

---

# 🗄️ Modèle Prisma Blackjack

```prisma
model BlackjackGame {
  id
  gameRoundId
  userId
  status
  betAmount
  playerCards
  dealerCards
  playerScore
  dealerScore
  playerSoft
  dealerSoft
  createdAt
  updatedAt
}
```

---

# 🚀 Installation

### Cloner le repo

```
git clone https://github.com/Ratsock6/diamond-casino-backend.git
```

---

### Installer les dépendances

```
npm install
```

---

### Variables d'environnement

Créer un fichier `.env`

```
DATABASE_URL=postgresql://user:password@localhost:5432/casino
JWT_SECRET=supersecret
JWT_REFRESH_SECRET=refreshsecret
```

---

### Prisma

```
npx prisma generate
npx prisma migrate dev
```

---

### Lancer le serveur

```
npm run start:dev
```

---

# 📊 Roadmap

### Blackjack

- DOUBLE
- SPLIT
- INSURANCE

### Casino

- tables multi‑joueurs
- WebSockets temps réel

### Analytics

- house edge réel
- statistiques casino

### Gameplay

- leaderboard joueurs
- achievements

---

# 📜 Licence

Projet fictif destiné à un usage **FiveM RP**.

Aucun argent réel impliqué.

---

# 👨‍💻 Auteur

**Antoine**
