FROM python:3.12-slim

WORKDIR /app

# System deps: curl for healthcheck, ca-certificates for HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir fastapi "uvicorn[standard]" beautifulsoup4

# Copy application source
COPY . .

# Persistent data lives in a volume
VOLUME ["/app/outputs", "/app/logs"]

EXPOSE 8081

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LOG_LEVEL=INFO
