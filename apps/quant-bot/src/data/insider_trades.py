"""SEC EDGAR Form 4 — recent insider buy/sell transactions."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import requests

log = logging.getLogger(__name__)

EDGAR_HEADERS = {"User-Agent": "ai-quant-bot research@example.com", "Accept-Encoding": "gzip"}
RECENT_FILINGS_URL = "https://efts.sec.gov/LATEST/search-index?q=%22form+type%22%3A%224%22&dateRange=custom&startdt={start}&enddt={end}&_source=file_date,period_of_report,entity_name,file_num&hits.hits.total.value=true&hits.hits._source=true&hits.hits.highlight=true"
FORM4_SEARCH = "https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=4&dateRange=custom&startdt={start}&enddt={end}"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
COMPANY_FACTS = "https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=4&dateRange=custom&startdt={start}&enddt={end}&hits.hits._source=true"


def _search_form4(ticker: str, days_back: int = 14) -> List[Dict]:
    """Search EDGAR full-text for Form 4 filings mentioning a ticker."""
    end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=4&dateRange=custom&startdt={start}&enddt={end}&hits.hits._source=true"
    try:
        r = requests.get(url, headers=EDGAR_HEADERS, timeout=10)
        r.raise_for_status()
        hits = r.json().get("hits", {}).get("hits", [])
        results = []
        for h in hits[:10]:
            src = h.get("_source", {})
            results.append({
                "ticker": ticker,
                "filed": src.get("file_date", ""),
                "entity": src.get("entity_name", ""),
                "form": src.get("form_type", "4"),
            })
        return results
    except Exception as exc:
        log.warning("EDGAR Form 4 search failed for %s: %s", ticker, exc)
        return []


def gather_insider_trades(tickers: List[str], days_back: int = 14) -> List[Dict]:
    """Return recent Form 4 filings for a list of tickers."""
    out = []
    for tk in tickers[:20]:  # cap to avoid rate limits
        filings = _search_form4(tk, days_back=days_back)
        out.extend(filings)
    log.info("Insider trades: %d filings found across %d tickers", len(out), len(tickers))
    return out
