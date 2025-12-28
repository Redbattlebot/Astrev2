FROM oven/bun:latest

WORKDIR /app

# 1. Install SurrealDB and Go
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy everything
COPY . .

# 3. SMART BUILD for Economy
# This script looks for the Economy folder (case-insensitive)
# and only builds if it finds .go files.
RUN if [ -d "Economy" ] || [ -d "economy" ]; then \
        cd [Ee]conomy && \
        if ls *.go >/dev/null 2>&1; then \
            if [ ! -f go.mod ]; then go mod init economy; fi && \
            go mod tidy && \
            go build -o economy-service .; \
        fi \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment & Ports
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
CMD ["/usr/local/bin/bun", "build/index.js"]
