"""One-off: align MongoDB hr_config with Google Sheets settings from .env."""
import os
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    sheet_url = os.environ.get("GOOGLE_SHEETS_URL", "").strip()
    enabled_raw = os.environ.get("GOOGLE_SHEETS_ENABLED", "true").strip().lower()
    enabled = enabled_raw in ("1", "true", "yes") and bool(sheet_url)
    update = {
        "google_sheets_enabled": enabled,
        "google_sheets_url": sheet_url,
        "google_sheets_tab": os.environ.get("GOOGLE_SHEETS_TAB", "Average Emp. Salary"),
        "google_sheets_products_tab": os.environ.get(
            "GOOGLE_SHEETS_PRODUCTS_TAB", "Products Pricing Full-DB-V1"
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.hr_config.update_one({}, {"$set": update}, upsert=True)
    print(f"hr_config updated: enabled={enabled}, url_set={bool(sheet_url)}")


if __name__ == "__main__":
    asyncio.run(main())
