# ---------------------------------------------------------------------------
# Multi-stage Dockerfile for ISO Policy Compliance Classifier
# Optimized for Google Cloud Run (CPU-only)
# ---------------------------------------------------------------------------

# --- Stage 1: Build dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .

# Install CPU-only PyTorch to shrink image (~700 MB smaller than full torch)
RUN pip install --no-cache-dir --target=/build/deps \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --target=/build/deps \
    -r requirements.txt

# --- Stage 2: Production image ---
FROM python:3.12-slim

# Prevent Python from buffering stdout/stderr (important for Cloud Run logs)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /build/deps /usr/local/lib/python3.12/site-packages

# Copy application code
COPY app.py .

# Model will be downloaded from GCS at runtime (see app.py)

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080

EXPOSE ${PORT}

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Start server — Cloud Run injects $PORT
CMD ["sh", "-c", "python -m uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
