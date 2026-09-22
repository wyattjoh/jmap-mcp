# syntax=docker/dockerfile:1

# --- Stage 1: Cache dependencies ---
FROM docker.io/denoland/deno:2.9.5 AS deps

WORKDIR /app

# Copy only dependency manifests first so source changes reuse this layer.
COPY deno.json deno.lock package.json ./
COPY packages/jmap/deno.json packages/jmap/deno.json
COPY packages/jmap-mcp/deno.json packages/jmap-mcp/deno.json

RUN deno install --frozen

# --- Stage 2: Final image ---
FROM docker.io/denoland/deno:2.9.5

LABEL org.opencontainers.image.title="jmap-mcp" \
      org.opencontainers.image.description="MCP server for JMAP email management" \
      org.opencontainers.image.source="https://github.com/wyattjoh/jmap-mcp" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

COPY --from=deps /deno-dir /deno-dir
COPY deno.json deno.lock package.json ./
COPY packages/jmap/deno.json packages/jmap/mod.ts packages/jmap/
COPY packages/jmap/src/ packages/jmap/src/
COPY packages/jmap-mcp/deno.json packages/jmap-mcp/deno.json
COPY packages/jmap-mcp/src/ packages/jmap-mcp/src/

RUN deno task check

USER deno

ENTRYPOINT ["deno", "run", "--allow-env", "--allow-net", "--cached-only", "packages/jmap-mcp/src/mod.ts"]
