"""All CREATE TABLE statements for the bot database."""

CREATE_STATEMENTS = [

    # ── Price history ─────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS prices (
        ticker      TEXT    NOT NULL,
        date        TEXT    NOT NULL,   -- YYYY-MM-DD
        open        REAL,
        high        REAL,
        low         REAL,
        close       REAL,
        volume      REAL,
        fetched_at  TEXT    NOT NULL,
        PRIMARY KEY (ticker, date)
    )
    """,

    # ── Macro / COT / EIA cache with TTL ─────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS macro_cache (
        series_id   TEXT    NOT NULL,
        date        TEXT    NOT NULL,   -- observation date
        value       REAL,
        source      TEXT,               -- fred / eia / worldbank / cot
        fetched_at  TEXT    NOT NULL,
        ttl_hours   INTEGER DEFAULT 24,
        PRIMARY KEY (series_id, date)
    )
    """,

    # ── Market regime snapshot per day ───────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS regimes (
        date                TEXT PRIMARY KEY,
        vix_spot            REAL,
        vix_regime          TEXT,       -- low / medium / high / extreme
        vix_term_structure  TEXT,       -- contango / backwardation
        yield_curve_bps     REAL,
        yield_curve_state   TEXT,       -- inverted / flat / normal / steep
        spy_trend           TEXT,       -- above_200ma / below_200ma
        sector_leader       TEXT,       -- top ETF by 1m momentum
        sector_laggard      TEXT,
        recorded_at         TEXT
    )
    """,

    # ── Paper trade signals ───────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS paper_trades (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date        TEXT    NOT NULL,
        signal_name     TEXT    NOT NULL,
        ticker          TEXT    NOT NULL,
        direction       TEXT    NOT NULL,   -- long / short
        confidence      TEXT,               -- low / medium / high
        rationale       TEXT,
        entry_date      TEXT,
        entry_price     REAL,
        exit_date       TEXT,
        exit_price      REAL,
        pnl_pct         REAL,
        status          TEXT DEFAULT 'open', -- open / win / loss / unknown
        days_held       INTEGER,
        hold_days       INTEGER DEFAULT 5,
        regime_vix      TEXT,
        regime_yc       TEXT
    )
    """,

    # ── LLM trade ideas ───────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS llm_ideas (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date            TEXT    NOT NULL,
        ticker              TEXT    NOT NULL,
        direction           TEXT,
        horizon             TEXT,           -- short_term / long_term
        conviction          TEXT,
        thesis              TEXT,
        entry_zone          TEXT,
        stop_loss           TEXT,
        target              TEXT,
        entry_price_at_call REAL,
        annual_vol          REAL,
        suggested_pos_pct   REAL,
        entry_date          TEXT,
        exit_price          REAL,
        pnl_pct             REAL,
        status              TEXT DEFAULT 'open',
        regime_vix          TEXT,
        regime_yc           TEXT
    )
    """,

    # ── Sector calls ─────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS sector_calls (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date    TEXT    NOT NULL,
        sector      TEXT    NOT NULL,
        stance      TEXT,               -- overweight / neutral / underweight
        rationale   TEXT,
        outcome_ret REAL,               -- ETF return after 1 month (backfilled)
        correct     INTEGER             -- 1 / 0 / NULL
    )
    """,

    # ── Computed features per ticker per day ──────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS features (
        ticker          TEXT    NOT NULL,
        date            TEXT    NOT NULL,
        rsi_14          REAL,
        momentum_1m     REAL,
        momentum_3m     REAL,
        vol_20d_ann     REAL,
        above_200ma     INTEGER,        -- 1 / 0
        bb_position     REAL,           -- 0-1, position within Bollinger Bands
        rel_vs_spy_1m   REAL,           -- relative return vs SPY
        PRIMARY KEY (ticker, date)
    )
    """,

    # ── News / sentiment history ──────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS news (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT    NOT NULL,
        sector      TEXT,
        title       TEXT    NOT NULL,
        source      TEXT,
        url         TEXT,
        sentiment   REAL    -- -1 to +1, NULL if not scored
    )
    """,

    # ── Run log ───────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS runs (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date            TEXT    NOT NULL,
        started_at          TEXT,
        finished_at         TEXT,
        duration_secs       REAL,
        llm_provider        TEXT,
        llm_model           TEXT,
        payload_chars       INTEGER,
        signals_generated   INTEGER,
        win_rate_pct        REAL,
        avg_pnl_pct         REAL,
        error               TEXT
    )
    """,

    # ── User memory — things the bot remembers about the user ────────────────
    """
    CREATE TABLE IF NOT EXISTS user_memory (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        category    TEXT    NOT NULL DEFAULT 'general',
        key         TEXT    NOT NULL UNIQUE,
        value       TEXT    NOT NULL,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
    )
    """,

    # ── Conversation log ─────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS conversation_log (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp       TEXT    NOT NULL,
        user_message    TEXT    NOT NULL,
        bot_response    TEXT,
        intent          TEXT    -- memory/db_query/trading/config
    )
    """,

    # ── Reminders — user-requested scheduled alerts ──────────────────────────
    """
    CREATE TABLE IF NOT EXISTS reminders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        message     TEXT    NOT NULL,       -- what to remind the user about
        due_at      TEXT    NOT NULL,       -- ISO-8601 UTC datetime
        created_at  TEXT    NOT NULL,
        fired       INTEGER DEFAULT 0       -- 0=pending, 1=sent
    )
    """,

    # ── ETF holdings daily snapshots ─────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS etf_holdings_snapshot (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker        TEXT    NOT NULL,
        snapshot_date TEXT    NOT NULL,
        holdings_json TEXT    NOT NULL,
        aum_m         REAL,
        nav           REAL,
        price         REAL,
        premium_pct   REAL,
        n_holdings    INTEGER,
        fetched_at    TEXT
    )
    """,

    # ── Indices for common queries ────────────────────────────────────────────
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_ehs_ticker_date ON etf_holdings_snapshot(ticker, snapshot_date)",
    "CREATE INDEX IF NOT EXISTS idx_prices_ticker_date ON prices(ticker, date)",
    "CREATE INDEX IF NOT EXISTS idx_paper_status ON paper_trades(status)",
    "CREATE INDEX IF NOT EXISTS idx_paper_signal ON paper_trades(signal_name)",
    "CREATE INDEX IF NOT EXISTS idx_llm_ticker ON llm_ideas(ticker)",
    "CREATE INDEX IF NOT EXISTS idx_regimes_date ON regimes(date)",
    "CREATE INDEX IF NOT EXISTS idx_features_ticker ON features(ticker, date)",
]
