FROM oven/bun:latest

WORKDIR /app

# 1. Install SurrealDB and Go
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy EVERYTHING first
# This ensures we have the files before we try to move into folders
COPY . .

# 3. Build the Economy Service using a "Smart Search"
# This looks for any folder named economy (case-insensitive) that has a main.go
RUN E_DIR=$(find . -maxdepth 2 -iname "economy" -type d | head -n 1) && \
    if [ -n "$E_DIR" ]; then \
        echo "Found Economy directory at: $E_DIR" && \
        cd "$E_DIR" && \
        if [ ! -f go.mod ]; then go mod init economy; fi && \
        go mod tidy && \
        go build -o economy-service .; \
    else \
        echo "WARNING: Economy directory not found. Skipping Go build."; \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Final Setup
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
CMD ["/usr/local/bin/bun", "build/index.js"]
