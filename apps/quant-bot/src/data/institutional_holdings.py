"""SEC 13F institutional holdings via EDGAR (free, no key).

13F filings are required quarterly from institutions managing >$100M.
Shows what Berkshire, Citadel, Bridgewater, etc. are buying/selling.

Flow:
  1. Fetch company_tickers.json → get CIK for known institutions
  2. Pull their most recent 13F-HR filing from submissions API
  3. Fetch the primary document and parse top holdings
"""
from __future__ import annotations

import logging
import re
import time
from typing import Dict, List, Optional

import requests

log = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "ai-quant-bot research@example.com"}
_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
_ARCHIVE_BASE = "https://www.sec.gov/Archives/edgar/data"
_SLEEP = 0.4

# Well-known institutions: name → CIK (zero-padded to 10 digits)
_INSTITUTIONS: Dict[str, str] = {
    "Berkshire Hathaway": "0001067983",
    "Bridgewater Associates": "0001350694",
    "Renaissance Technologies": "0001037389",
    "Citadel Advisors": "0001423298",
    "D.E. Shaw": "0001009207",
    "Two Sigma": "0001450144",
    "Millennium Management": "0001273087",
}


def _get_latest_13f(cik: str) -> Optional[Dict]:
    """Return {accn, date} for the most recent 13F-HR filing."""
    try:
        r = requests.get(_SUBMISSIONS_URL.format(cik=cik), headers=_HEADERS, timeout=12)
        r.raise_for_status()
        filings = r.json().get("filings", {}).get("recent", {})
    except Exception as exc:
        log.debug("Submissions fetch failed for CIK %s: %s", cik, exc)
        return None

    forms = filings.get("form", [])
    dates = filings.get("filingDate", [])
    accns = filings.get("accessionNumber", [])

    for form, date, accn in zip(forms, dates, accns):
        if form in ("13F-HR", "13F-HR/A"):
            return {"date": date, "accn": accn}
    return None


def _find_infotable_url(cik_num: str, adsh_flat: str, accn: str) -> Optional[str]:
    """Find the info table XML URL from the filing index page."""
    index_url = f"{_ARCHIVE_BASE}/{cik_num}/{adsh_flat}/{accn}-index.htm"
    try:
        ir = requests.get(index_url, headers=_HEADERS, timeout=10)
        if ir.status_code != 200:
            return None
        # Prefer the raw XML (not xsl-transformed version)
        xmls = re.findall(r'href="(/Archives/edgar/data/[^"]+\.xml)"', ir.text, re.IGNORECASE)
        # Filter out the primary_doc / cover, keep the info table (usually the larger one)
        for path in xmls:
            if "xsl" not in path.lower() and "primary" not in path.lower():
                return f"https://www.sec.gov{path}"
        if xmls:
            return f"https://www.sec.gov{xmls[-1]}"
    except Exception as exc:
        log.debug("Index fetch failed: %s", exc)
    return None


def _parse_infotable_xml(text: str) -> List[Dict]:
    """Parse holdings from a 13F info table XML. Handles namespace prefixes."""
    # Strip XML namespaces for uniform matching
    text = re.sub(r'<(/?)[\w]+:', r'<\1', text)
    holdings: List[Dict] = []

    for block in re.finditer(r'<infoTable>(.*?)</infoTable>', text, re.DOTALL | re.IGNORECASE):
        b = block.group(1)
        def _tag(tag: str) -> str:
            m = re.search(rf'<{tag}[^>]*>([^<]+)</{tag}>', b, re.IGNORECASE)
            return m.group(1).strip() if m else ""

        name    = _tag("nameOfIssuer")[:60]
        cls     = _tag("titleOfClass")[:20]
        cusip   = _tag("cusip")
        val_str = _tag("value")
        shr_str = _tag("sshPrnamt")

        if not name or not val_str:
            continue
        try:
            holdings.append({
                "name":    name,
                "class":   cls,
                "cusip":   cusip,
                "value_k": int(val_str),
                "shares":  int(shr_str) if shr_str else 0,
            })
        except ValueError:
            continue

    holdings.sort(key=lambda h: h["value_k"], reverse=True)
    return holdings[:10]


def _fetch_holdings_from_filing(cik: str, accn: str) -> List[Dict]:
    """Fetch and parse the info table from a 13F filing."""
    cik_num = cik.lstrip("0")
    adsh_flat = accn.replace("-", "")

    doc_url = _find_infotable_url(cik_num, adsh_flat, accn)
    if not doc_url:
        return []

    try:
        time.sleep(_SLEEP)
        dr = requests.get(doc_url, headers=_HEADERS, timeout=15)
        if dr.status_code != 200:
            return []
        return _parse_infotable_xml(dr.text)
    except Exception as exc:
        log.debug("13F doc fetch failed: %s", exc)
        return []


def fetch_institutional_holdings(max_institutions: int = 4) -> List[Dict]:
    """Fetch top holdings for a subset of major institutions."""
    results = []
    count = 0

    for name, cik in _INSTITUTIONS.items():
        if count >= max_institutions:
            break

        filing = _get_latest_13f(cik)
        if not filing:
            log.debug("No 13F found for %s", name)
            continue

        time.sleep(_SLEEP)
        holdings = _fetch_holdings_from_filing(cik, filing["accn"])
        if not holdings:
            log.debug("No holdings parsed for %s", name)
            continue

        total_value_m = sum(h["value_k"] for h in holdings) / 1000
        results.append({
            "institution":  name,
            "filing_date":  filing["date"],
            "top_holdings": holdings,
            "aum_sample_m": round(total_value_m, 0),
        })
        count += 1
        log.debug("13F %s (%s): %d holdings", name, filing["date"], len(holdings))
        time.sleep(_SLEEP)

    log.info("Institutional 13F: %d/%d institutions fetched", len(results), max_institutions)
    return results
