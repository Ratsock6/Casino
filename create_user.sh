#!/bin/bash

API_URL="http://localhost:3000"

FIRSTNAMES=("Lucas" "Emma" "Nathan" "Léa" "Théo" "Camille" "Hugo" "Manon" "Axel" "Inès" "Tom" "Chloé" "Maxime" "Sarah" "Romain" "Julie" "Antoine" "Laura" "Kevin" "Alice")
LASTNAMES=("Martin" "Bernard" "Dubois" "Thomas" "Robert" "Richard" "Petit" "Durand" "Leroy" "Moreau" "Simon" "Laurent" "Lefebvre" "Michel" "Garcia" "David" "Bertrand" "Roux" "Vincent" "Fournier")

echo "🎰 Création de 20 utilisateurs de test..."
echo "─────────────────────────────────────────"

for i in $(seq 1 20); do
  FIRSTNAME=${FIRSTNAMES[$((i-1))]}
  LASTNAME=${LASTNAMES[$((i-1))]}
  USERNAME="player${i}"
  PASSWORD="Password123!"

  YEAR=$((1990 + i))
  MONTH=$(printf "%02d" $((i % 12 + 1)))
  BIRTHDATE="${YEAR}-${MONTH}-15"

  PHONE=$(printf "%05d-%05d" $i $((RANDOM % 99999)))

  RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\",
      \"firstName\": \"$FIRSTNAME\",
      \"lastName\": \"$LASTNAME\",
      \"birthDate\": \"$BIRTHDATE\",
      \"phoneNumber\": \"$PHONE\",
      \"password\": \"$PASSWORD\"
    }")

  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ $USERNAME ($FIRSTNAME $LASTNAME) — $PHONE"
  else
    echo "❌ $USERNAME — $(echo $RESPONSE | grep -o '"message":"[^"]*"')"
  fi
done

echo "─────────────────────────────────────────"
echo "✅ Terminé ! Mot de passe de tous les comptes : Password123!"
