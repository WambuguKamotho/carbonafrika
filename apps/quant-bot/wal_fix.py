import sqlite3, sys, os

db = r"C:\Users\wambu\Documents\ai_quant_bot\outputs\bot.db"
out = r"C:\Users\wambu\Documents\ai_quant_bot\wal_fix.log"

with open(out, "w") as log:
    try:
        log.write(f"Opening: {db}\n")
        conn = sqlite3.connect(db, timeout=30)
        r = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
        log.write(f"Checkpoint result: {r}\n")
        mode = conn.execute("PRAGMA journal_mode=DELETE").fetchone()
        log.write(f"Journal mode set to: {mode}\n")
        conn.commit()
        conn.close()
        log.write("Success\n")
    except Exception as e:
        log.write(f"Error: {e}\n")
        sys.exit(1)
