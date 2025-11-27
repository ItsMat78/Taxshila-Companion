#!/bin/bash

# 1. Load variables from .env (ignoring comments)
export $(grep '^ONE_SIGNAL' .env | xargs)
# 2. Check if a message was provided
if [ -z "$1" ]; then
  echo "Usage: ./send_push.sh \"Your Message Here\""
  exit 1
fi

MESSAGE=$1
# Replace this with your personal Test Player ID (from OneSignal Dashboard)
PLAYER_ID="876cb922-8abf-4f26-b5ef-bfe06ca72385" 

echo "Sending push: '$MESSAGE'..."

# 3. Send the request
curl --request POST \
     --url https://onesignal.com/api/v1/notifications \
     --header "Authorization: Key $ONE_SIGNAL_REST_API_KEY" \
     --header "content-type: application/json" \
     --data "{
       \"app_id\": \"$ONE_SIGNAL_APP_ID\",
       \"include_player_ids\": [\"$PLAYER_ID\"],
       \"headings\": {\"en\": \"Terminal Alert\"},
       \"contents\": {\"en\": \"$MESSAGE\"},
       \"data\": {\"targetUrl\": \"https://taxshilacompanion.vercel.app/member/alerts\"}
     }" --silent

echo -e "\nDone!"