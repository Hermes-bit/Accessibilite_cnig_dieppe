FROM python:3.14-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ---- deps ----
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- production ----
FROM deps AS production
COPY . .
RUN useradd --no-create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:8000", "--access-logfile=-", "--error-logfile=-", "wsgi:app"]
