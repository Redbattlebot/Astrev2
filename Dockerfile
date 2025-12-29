# --- STAGE 1: Build Go Economy Service ---
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY . .
WORKDIR /app/Economy
RUN go mod tidy && go build -o Economy_Binary main.go

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

# FIX: Change directory to /app/Site before running the processes
# This satisfies the "Current working directory should be the Site folder" check.
CMD ["sh", "-c", "Economy_Binary & cd /app/Site && bun run build/index.js"]
