FROM python:3.13-slim

WORKDIR /app

# Copy uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies using uv (much faster!)
RUN uv pip install --system --no-cache .

# Copy application code
COPY main.py ./

# Cloud Run will set PORT env var (defaults to 8080)
ENV PORT=8080

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
