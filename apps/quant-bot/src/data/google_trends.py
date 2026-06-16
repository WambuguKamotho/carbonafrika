"""Google Trends — retail search interest for tickers and sector keywords."""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

log = logging.getLogger(__name__)

# Patch urllib3 Retry to accept old 'method_whitelist' kwarg (pytrends compat with urllib3 2.x)
try:
    import urllib3.util.retry as _retry
    _orig_retry_init = _retry.Retry.__init__
    def _patched_retry_init(self, *args, **kwargs):
        if "method_whitelist" in kwargs:
            kwargs["allowed_methods"] = kwargs.pop("method_whitelist")
        _orig_retry_init(self, *args, **kwargs)
    _retry.Retry.__init__ = _patched_retry_init
except Exception:
    pass


def gather_google_trends(keywords: List[str], timeframe: str = "now 7-d") -> Dict[str, Optional[int]]:
    """
    Return the current interest score (0-100) for each keyword.
    Uses pytrends; returns empty dict if unavailable.
    """
    if not keywords:
        return {}
    try:
        from pytrends.request import TrendReq
    except ImportError:
        log.warning("pytrends not installed; skipping Google Trends")
        return {}

    try:
        pt = TrendReq(hl="en-US", tz=0, timeout=(5, 15), retries=1, backoff_factor=0.5)
        out: Dict[str, Optional[int]] = {}
        consecutive_failures = 0

        # pytrends handles max 5 keywords per request
        for i in range(0, len(keywords), 5):
            if consecutive_failures >= 2:
                # Google has blocked this session — stop hammering and mark rest as None
                log.warning("Google Trends: 2 consecutive 429s — skipping remaining batches")
                for kw in keywords[i:]:
                    out[kw] = None
                break

            batch = keywords[i : i + 5]
            try:
                pt.build_payload(batch, timeframe=timeframe, geo="US")
                df = pt.interest_over_time()
                if df.empty:
                    for kw in batch:
                        out[kw] = None
                    consecutive_failures = 0
                    continue
                for kw in batch:
                    if kw in df.columns:
                        out[kw] = int(df[kw].iloc[-1])
                    else:
                        out[kw] = None
                consecutive_failures = 0
                if i + 5 < len(keywords):
                    time.sleep(5)  # respectful delay — Google bans aggressive scrapers
            except Exception as exc:
                log.warning("Google Trends batch %s failed: %s", batch, exc)
                for kw in batch:
                    out[kw] = None
                if "429" in str(exc):
                    consecutive_failures += 1
                    time.sleep(10)  # back off on rate limit
                else:
                    consecutive_failures = 0

        log.info("Google Trends: fetched %d keywords", len(out))
        return out
    except Exception as exc:
        log.warning("Google Trends failed: %s", exc)
        return {}
