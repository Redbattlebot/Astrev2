# --- STAGE 1: Build Go Economy Service ---
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY . .
WORKDIR /app/Economy
RUN rm -f go.mod go.sum || true && \
    go mod init Economy && \
    go get github.com/surrealdb/surrealdb.go@v1.0.0 && \
    go mod tidy && \
    go build -o Economy_Binary .

# --- STAGE 2: Build SvelteKit Site ---
FROM oven/bun:latest AS bun-builder
WORKDIR /app
COPY . .
WORKDIR /app/Site
RUN bun install
RUN bun run build

# --- STAGE 3: Final Runner ---
FROM oven/bun:latest
WORKDIR /app

# CRITICAL: This gives Go the authority to connect to SurrealDB Cloud (TLS/SSL)
USER root
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com

# Copy only the compiled/built artifacts
COPY --from=go-builder /app/Economy/Economy_Binary /usr/local/bin/Economy_Binary
COPY --from=bun-builder /app/Site/build /app/Site/build
COPY --from=bun-builder /app/Site/package.json /app/Site/package.json
COPY --from=bun-builder /app/Site/node_modules /app/Site/node_modules

EXPOSE 10000

# Start Economy and Site. No hidden scripts.
CMD ["sh", "-c", "Economy_Binary & bun run /app/Site/build/index.js"]
