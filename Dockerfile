# --- STAGE 1: Build Go Economy Service ---
# Bumped to 1.23 to satisfy SurrealDB driver requirements
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY . .
RUN ACTUAL_ECONOMY=$(find . -maxdepth 2 -name "*conomy*" -type d | head -n 1) && \
    cd "$ACTUAL_ECONOMY" && \
    rm -f go.mod go.sum || true && \
    go mod init Economy && \
    # Ensure we get the latest compatible driver
    go get github.com/surrealdb/surrealdb.go@v1.0.0 && \
    go mod tidy && \
    go build -o /app/Economy_Binary .

# --- STAGE 2: Build SvelteKit Site ---
FROM oven/bun:latest AS bun-builder
WORKDIR /app
COPY . .
WORKDIR /app/Site
RUN bun install
RUN bun run build

# --- STAGE 3: Final Production Runner ---
FROM oven/bun:latest
WORKDIR /app

# Install only what's necessary for the runtime
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the finished products from previous stages
COPY --from=go-builder /app/Economy_Binary /app/Economy_Binary
COPY --from=bun-builder /app/Site/build /app/Site/build
COPY --from=bun-builder /app/Site/package.json /app/Site/package.json
COPY --from=bun-builder /app/Site/node_modules /app/Site/node_modules

# Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com

EXPOSE 10000

# Launch Script: Starts Economy in background, then the Site
CMD /app/Economy_Binary & bun run /app/Site/build/index.js
