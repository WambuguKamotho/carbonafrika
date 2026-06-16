"""Run this once to find your Telegram chat_id.

Steps:
  1. Add TELEGRAM_BOT_TOKEN to your .env
  2. Open Telegram and send /start to your bot
  3. Run: python -m src.reports.get_chat_id
  4. Copy the chat_id printed and add it to .env as TELEGRAM_CHAT_ID
"""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
import requests

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

token = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not token:
    print("ERROR: TELEGRAM_BOT_TOKEN not set in .env")
    raise SystemExit(1)

resp = requests.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=10)
data = resp.json()

if not data.get("ok"):
    print(f"Telegram API error: {data}")
    raise SystemExit(1)

updates = data.get("result", [])
if not updates:
    print("No messages found. Make sure you sent /start to your bot on Telegram first, then re-run this script.")
    raise SystemExit(1)

seen: set = set()
for upd in updates:
    msg = upd.get("message") or upd.get("channel_post") or {}
    chat = msg.get("chat", {})
    chat_id = chat.get("id")
    name = chat.get("first_name") or chat.get("title") or ""
    username = chat.get("username") or ""
    if chat_id and chat_id not in seen:
        seen.add(chat_id)
        print(f"chat_id: {chat_id}  name: {name}  username: @{username}")

print("\nAdd this to your .env:\nTELEGRAM_CHAT_ID=<the number above>")
