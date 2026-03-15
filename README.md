# 🎰 Diamond Casino Backend (FiveM RP)

Backend d'un casino en ligne fictif inspiré du Diamond Casino de GTA V,
conçu pour être utilisé dans un serveur FiveM RP.

⚠️ Important : ce projet utilise uniquement des jetons virtuels. Aucun
argent réel.

------------------------------------------------------------------------

## Stack technique

Backend - NestJS - TypeScript

Base de données - PostgreSQL

ORM - Prisma

Authentification - JWT - Refresh tokens

Sécurité - Idempotency system - Validation DTO - Transactions Prisma

------------------------------------------------------------------------

## Architecture

Tous les jeux passent par un système central :

Game -\> BetService -\> Wallet -\> WalletTransaction

Cela garantit : - cohérence financière - traçabilité - audit des parties

------------------------------------------------------------------------

## Rôles

PLAYER\
VIP\
ADMIN\
SUPER_ADMIN

VIP possède des limites de pari plus élevées.

------------------------------------------------------------------------

## Wallet

Chaque utilisateur possède un wallet.

Wallet : - id - userId - balance - createdAt - updatedAt

WalletTransaction : - BET - WIN - LOSS - REFUND - ADMIN_CREDIT -
ADMIN_DEBIT

------------------------------------------------------------------------

## Anti‑triche

Protection contre : - double requête - double click - replay API

Header utilisé :

x-idempotency-key

Utilisé pour : - slots spin - roulette spin - blackjack start

------------------------------------------------------------------------

## Limites de pari

GameConfigService

Exemple :

ROULETTE - standardMaxBet = 10000 - vipMaxBet = 50000

SLOTS - standardMaxBet = 20000 - vipMaxBet = 100000

BLACKJACK - standardMaxBet = 10000 - vipMaxBet = 50000

------------------------------------------------------------------------

## Jeux

### Slots

Endpoint

POST /slots/spin

Body { "bet": number }

------------------------------------------------------------------------

### Roulette

Endpoint

POST /roulette/spin

Body

{ "bets": \[ { "type": "straight", "numbers": \[17\], "amount": 100 } \]
}

Paris supportés : - straight - split - street - corner - six line - red
/ black - even / odd - low / high - dozen - column

Support du 0 : - split 0-1 - split 0-2 - split 0-3 - street 0-1-2 -
street 0-2-3

------------------------------------------------------------------------

### Blackjack

Endpoints

POST /blackjack/start POST /blackjack/action GET /blackjack/:gameId

Actions : - HIT - STAND

Fonctionnalités : - blackjack naturel - bust - push - dealer play -
carte cachée du dealer

Fonctionnalités futures : - DOUBLE - SPLIT - INSURANCE

------------------------------------------------------------------------

## Installation

Cloner le repo

git clone https://github.com/yourrepo/diamond-casino-backend.git

Installer

npm install

Créer un .env

DATABASE_URL=postgresql://user:password@localhost:5432/casino
JWT_SECRET=secret JWT_REFRESH_SECRET=refreshsecret

Prisma

npx prisma generate npx prisma migrate dev

Lancer

npm run start:dev

------------------------------------------------------------------------

## Roadmap

Blackjack - DOUBLE - SPLIT - INSURANCE

Casino - WebSocket temps réel - tables multi‑joueurs

Analytics - house edge - statistiques casino

Gameplay - leaderboard joueurs - achievements

------------------------------------------------------------------------

## Auteur

Antoine Allou‑Vincheneux
