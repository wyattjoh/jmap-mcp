# syntax=docker/dockerfile:1

# --- Stage 1: Cache dependencies ---
FROM docker.io/denoland/deno:2.3.2 AS deps

WORKDIR /app

# Copy only dependency manifests first for optimal layer caching.
# This layer is only rebuilt when dependencies change.
COPY deno.json deno.lock ./

# Pre-cache all dependencies without running the app
RUN deno install --frozen

# --- Stage 2: Final image ---
FROM docker.io/denoland/deno:2.3.2

LABEL org.opencontainers.image.title="jmap-mcp" \
      org.opencontainers.image.description="MCP server for JMAP email management" \
      org.opencontainers.image.source="https://github.com/wyattjoh/jmap-mcp" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Bring in the pre-cached dependency tree from the deps stage
COPY --from=deps /deno-dir /deno-dir

# Copy application source
COPY deno.json deno.lock ./
COPY src/ src/

# Type-check and cache the application ahead of time so startup is instant
RUN deno check src/mod.ts

# Drop to non-root user (provided by the official Deno image)
USER deno

ENTRYPOINT ["deno", "run", "--allow-env", "--allow-net", "--cached-only", "src/mod.ts"]
