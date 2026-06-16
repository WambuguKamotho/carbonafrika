"""CFTC Commitments of Traders (COT) — institutional futures positioning."""
from __future__ import annotations

import io
import logging
import zipfile
from typing import Dict, List

import requests
import pandas as pd

log = logging.getLogger(__name__)

# CFTC publishes weekly COT data as CSV inside a zip
COT_URL = "https://www.cftc.gov/files/dea/history/fut_fin_txt_{year}.zip"

# Markets we care about (must match CFTC market names exactly)
MARKETS_OF_INTEREST = [
    "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE",
    "NASDAQ-100 MINI - CHICAGO MERCANTILE EXCHANGE",
    "10-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE",
    "GOLD - COMMODITY EXCHANGE INC.",
    "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE",
    "EURO FX - CHICAGO MERCANTILE EXCHANGE",
]


def _net_position(row: pd.Series) -> int:
    """Asset manager or leveraged fund net long = longs - shorts."""
    try:
        return int(row.get("Asset Mgr Longs", 0)) - int(row.get("Asset Mgr Shorts", 0))
    except Exception:
        return 0


def gather_cot(year: int | None = None) -> List[Dict]:
    """Fetch the latest COT report and return net positioning for key markets."""
    import datetime
    year = year or datetime.date.today().year
    url = COT_URL.format(year=year)
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            name = next(n for n in z.namelist() if n.endswith(".txt"))
            df = pd.read_csv(z.open(name), low_memory=False)
    except Exception as exc:
        log.warning("COT fetch failed: %s", exc)
        return []

    # Keep only latest report date per market
    df["Report_Date_as_YYYY-MM-DD"] = pd.to_datetime(
        df.get("Report_Date_as_YYYY-MM-DD", df.get("As_of_Date_In_Form_YYMMDD", "")),
        errors="coerce",
    )
    df = df.sort_values("Report_Date_as_YYYY-MM-DD").groupby("Market_and_Exchange_Names").last().reset_index()

    out = []
    for _, row in df.iterrows():
        name = str(row.get("Market_and_Exchange_Names", ""))
        if not any(m in name for m in MARKETS_OF_INTEREST):
            continue
        try:
            net = _net_position(row)
            out.append({
                "market": name.split(" - ")[0].strip(),
                "as_of": str(row.get("Report_Date_as_YYYY-MM-DD", ""))[:10],
                "asset_mgr_net_long": net,
                "lev_fund_net_long": int(row.get("Lev Money Longs", 0)) - int(row.get("Lev Money Shorts", 0)),
            })
        except Exception:
            continue

    log.info("COT: %d markets loaded", len(out))
    return out
