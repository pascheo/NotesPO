#!/bin/bash
# Double-cliquez sur ce fichier dans le Finder pour démarrer l'application
# NotesPO sans avoir besoin d'ouvrir le Terminal manuellement.

cd "$(dirname "$0")" || exit 1

# Utilise nvm si disponible pour sélectionner une version stable de Node
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js est introuvable. Installez-le avec : brew install node"
  echo "Appuyez sur une touche pour fermer cette fenêtre."
  read -r -n 1
  exit 1
fi

echo "📦 Vérification des dépendances..."
if [ ! -d "backend/node_modules" ]; then
  echo "   Installation des dépendances backend (première fois)..."
  (cd backend && npm install)
fi
if [ ! -d "frontend/node_modules" ]; then
  echo "   Installation des dépendances frontend (première fois)..."
  (cd frontend && npm install)
fi
echo "🚀 Démarrage de l'API (backend)..."
(cd backend && npm start > /tmp/notespo-backend.log 2>&1 &)

echo "🚀 Démarrage de l'interface (frontend)..."
(cd frontend && npm run dev > /tmp/notespo-frontend.log 2>&1 &)

echo "⏳ Attente du démarrage des serveurs..."
sleep 4

echo "🌐 Ouverture du navigateur..."
open "http://localhost:5173"

echo ""
echo "✅ NotesPO est lancé : http://localhost:5173"
echo "   Vous pouvez fermer cette fenêtre, les serveurs continuent de tourner."
echo "   Pour tout arrêter, double-cliquez sur arreter.command"
echo ""
echo "Appuyez sur une touche pour fermer cette fenêtre (les serveurs continueront)."
read -r -n 1
