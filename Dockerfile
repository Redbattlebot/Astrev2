FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies (SurrealDB & Go)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh

# Install Go 1.21 as recommended by Mercury docs
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy the entire project
COPY . .

# 3. Build the Economy Service using the linked instructions
# We use a case-insensitive search to ensure we find the folder
RUN E_PATH=$(find . -maxdepth 2 -iname "economy" -type d | head -n 1) && \
    if [ -n "$E_PATH" ]; then \
        cd "$E_PATH" && \
        go mod tidy && \
        go build -o economy-service .; \
    fi

# 4. Build the SvelteKit Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment & Networking
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

# 6. Launch
WORKDIR /app/Site
CMD ["/usr/local/bin/bun", "build/index.js"]
