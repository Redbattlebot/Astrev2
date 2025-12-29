# --- STAGE 1: Build Go Economy Service ---
# Use 'latest' to get the most recent Go version available
FROM golang:alpine AS go-builder
WORKDIR /app
COPY . .
WORKDIR /app/Economy

# FIX: Force the go.mod to use 1.23 so it matches the environment
RUN go mod edit -go=1.23 && \
    go mod tidy && \
    go build -o Economy_Binary main.go

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

# Authority for Cloud SSL/TLS
USER root
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com

# Copy artifacts
COPY --from=go-builder /app/Economy/Economy_Binary /usr/local/bin/Economy_Binary
COPY --from=bun-builder /app/Site/build /app/Site/build
COPY --from=bun-builder /app/Site/package.json /app/Site/package.json
COPY --from=bun-builder /app/Site/node_modules /app/Site/node_modules

EXPOSE 10000

# Start Economy and move into Site folder for Bun
CMD ["sh", "-c", "Economy_Binary & cd /app/Site && bun run build/index.js"]
