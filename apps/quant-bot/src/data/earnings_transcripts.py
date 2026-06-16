"""Earnings transcript sentiment via SEC EDGAR 8-K filings + LLM tone scoring.

Flow:
  1. Resolve ticker → CIK via SEC company_tickers.json (cached in DB)
  2. Pull recent 8-K filings from SEC submissions API (date-ordered, no relevance sort issues)
  3. Fetch the press release exhibit text from EDGAR Archives
  4. Score tone with Groq LLM (bullish / bearish / mixed)

No API key required — SEC EDGAR is fully public.
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "ai-quant-bot research@example.com"}
_TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"
_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{adsh_flat}/"
_MAX_TEXT_CHARS = 2500
_SLEEP = 0.4

# Module-level CIK cache (lives as long as process — reloaded each run is fine)
_cik_cache: Optional[Dict[str, str]] = None


def _get_cik_map() -> Dict[str, str]:
    """Return {ticker: padded_cik} from SEC. Cached in memory."""
    global _cik_cache
    if _cik_cache is not None:
        return _cik_cache
    try:
        r = requests.get(_TICKER_CIK_URL, headers=_HEADERS, timeout=15)
        r.raise_for_status()
        raw = r.json()
        _cik_cache = {v["ticker"]: str(v["cik_str"]).zfill(10) for v in raw.values()}
        log.debug("Loaded %d ticker→CIK mappings from SEC", len(_cik_cache))
        return _cik_cache
    except Exception as exc:
        log.warning("Could not load SEC CIK map: %s", exc)
        return {}


def _get_recent_8k(cik: str, days_back: int) -> Optional[Dict]:
    """Return most recent 8-K filing within days_back. Returns {date, accn} or None."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    try:
        r = requests.get(_SUBMISSIONS_URL.format(cik=cik), headers=_HEADERS, timeout=12)
        r.raise_for_status()
        filings = r.json().get("filings", {}).get("recent", {})
    except Exception as exc:
        log.debug("Submissions fetch failed: %s", exc)
        return None

    forms = filings.get("form", [])
    dates = filings.get("filingDate", [])
    accns = filings.get("accessionNumber", [])
    descs = filings.get("primaryDocument", [])

    for form, date, accn, doc in zip(forms, dates, accns, descs):
        if form == "8-K" and date >= cutoff:
            return {"date": date, "accn": accn, "doc": doc}
    return None


def _fetch_exhibit_text(cik: str, accn: str) -> Optional[str]:
    """Fetch press release text from EDGAR for a given CIK + accession number."""
    cik_num = cik.lstrip("0")
    adsh_flat = accn.replace("-", "")
    index_url = f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{adsh_flat}/{accn}-index.htm"
    try:
        ir = requests.get(index_url, headers=_HEADERS, timeout=10)
        if ir.status_code != 200:
            return None
        # Find exhibit 99.1 href
        m = re.search(r'href="([^"]*(?:ex[_-]?99|press[_-]?release)[^"]*\.(?:htm|txt))"',
                      ir.text, re.IGNORECASE)
        if not m:
            # Fallback: any .htm exhibit
            m = re.search(r'href="([^"]*\.htm)"', ir.text, re.IGNORECASE)
        if not m:
            return None

        exhibit_path = m.group(1)
        if exhibit_path.startswith("/"):
            exhibit_url = f"https://www.sec.gov{exhibit_path}"
        else:
            exhibit_url = f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{adsh_flat}/{exhibit_path}"

        time.sleep(_SLEEP)
        er = requests.get(exhibit_url, headers=_HEADERS, timeout=15)
        if er.status_code != 200:
            return None

        raw = re.sub(r"<[^>]+>", " ", er.text)
        raw = re.sub(r"\s+", " ", raw).strip()
        # Skip SEC header boilerplate — look for first mention of revenue/earnings
        m2 = re.search(r"(revenue|earnings|net income|eps|diluted)", raw, re.IGNORECASE)
        start = max(0, (m2.start() - 200)) if m2 else 0
        return raw[start: start + _MAX_TEXT_CHARS]

    except Exception as exc:
        log.debug("Exhibit fetch failed: %s", exc)
        return None


def _score_with_llm(text: str, ticker: str) -> Optional[Dict]:
    """Score earnings text with Groq LLM. Returns {tone, themes, guidance} or None."""
    try:
        from groq import Groq
        import os
        client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
        prompt = (
            f"Analyze this earnings filing excerpt for {ticker}. "
            f"Return ONLY a valid JSON object, no markdown fences:\n"
            f'{{"tone": "bullish|bearish|mixed", '
            f'"key_themes": ["up to 3 short phrases"], '
            f'"guidance": "raised|lowered|maintained|none"}}\n\n'
            f"Text: {text[:2000]}"
        )
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.1,
        )
        raw = resp.choices[0].message.content.strip()
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception as exc:
        log.debug("LLM scoring failed for %s: %s", ticker, exc)
    return None


def fetch_recent_transcripts(tickers: List[str], days_back: int = 95) -> List[Dict]:
    """Fetch and score recent 8-K earnings filings for a list of tickers.

    days_back defaults to 95 (~one quarter) so we always catch the most recent earnings.
    Returns list of {ticker, date, tone, themes, guidance, excerpt}.
    """
    cik_map = _get_cik_map()
    results: List[Dict] = []

    for i, ticker in enumerate(tickers):
        if i > 0:
            time.sleep(_SLEEP)

        cik = cik_map.get(ticker)
        if not cik:
            log.debug("No CIK for %s", ticker)
            continue

        filing = _get_recent_8k(cik, days_back)
        if not filing:
            log.debug("No recent 8-K for %s within %d days", ticker, days_back)
            continue

        time.sleep(_SLEEP)
        text = _fetch_exhibit_text(cik, filing["accn"])
        if not text:
            log.debug("Could not fetch exhibit text for %s", ticker)
            continue

        scored = _score_with_llm(text, ticker)
        results.append({
            "ticker":     ticker,
            "date":       filing["date"],
            "tone":       scored.get("tone", "mixed") if scored else "unknown",
            "themes":     scored.get("key_themes", []) if scored else [],
            "guidance":   scored.get("guidance", "none") if scored else "none",
            "excerpt":    text[:300],
            "llm_scored": scored is not None,
        })
        log.debug("Transcript %s (%s): tone=%s", ticker, filing["date"],
                  results[-1]["tone"])

    log.info("Earnings transcripts: %d/%d tickers with recent filings", len(results), len(tickers))
    return results
