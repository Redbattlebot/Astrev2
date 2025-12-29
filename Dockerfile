# --- STAGE 1: Build Go Economy Service ---
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
COPY . .
# Navigate directly to the Economy folder to avoid 'find' errors
WORKDIR /app/Economy
RUN rm -f go.mod go.sum || true && \
    go mod init Economy && \
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

# Ensure we have a clean environment without any old "surreal" bypasses
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy binaries and build files
COPY --from=go-builder /app/Economy/Economy_Binary /usr/local/bin/Economy_Binary
COPY --from=bun-builder /app/Site/build /app/Site/build
COPY --from=bun-builder /app/Site/package.json /app/Site/package.json
COPY --from=bun-builder /app/Site/node_modules /app/Site/node_modules

# Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com

# Use port 10000 for Render
EXPOSE 10000

# We use 'sh -c' to ensure the background process (&) is handled correctly by the OS
CMD sh -c "Economy_Binary & bun run /app/Site/build/index.js"
