#!/bin/bash
# Mathiya - database backup
#
# How to use (about 1 minute):
#   1. Open Terminal inside this project folder
#   2. Run:   bash backup-database.sh
#   3. Paste your MongoDB connection string when asked
#      (nothing shows on screen while you paste - that is normal)
#
# The backup is saved in your Documents folder. Copy it to iCloud or a
# USB drive as well. Do this at least once a month, and always before
# putting a new version of the app online.
#
# To restore a backup later (ask for help first!):
#   mongorestore --uri="YOUR_CONNECTION_STRING" --drop "BACKUP_FOLDER"

if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump is not installed. Install it with:"
  echo "  brew install mongodb-database-tools"
  exit 1
fi

echo "Paste your MongoDB connection string, then press Return:"
read -rs URI
echo

if [ -z "$URI" ]; then
  echo "Nothing was pasted. Backup stopped."
  exit 1
fi

FOLDER="$HOME/Documents/mathiya-db-backup-$(date +%d%b%Y-%H%M)"

if mongodump --uri="$URI" --out="$FOLDER"; then
  unset URI
  echo
  echo "Backup finished. Saved in:"
  echo "  $FOLDER"
  echo "Tip: copy this folder to iCloud or a USB drive too."
else
  unset URI
  echo
  echo "Backup FAILED. Check the connection string and try again."
  exit 1
fi
