#!/bin/bash
# Double-cliquez sur ce fichier dans le Finder pour arrêter les serveurs
# de l'application NotesPO (backend + frontend).

echo "🛑 Arrêt des serveurs NotesPO..."

arreter_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti "tcp:$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill 2>/dev/null
  fi
}

arreter_port 3001   # backend
arreter_port 5173   # frontend (Vite)

sleep 1
echo "✅ Serveurs arrêtés."
echo ""
echo "Appuyez sur une touche pour fermer cette fenêtre."
read -r -n 1
