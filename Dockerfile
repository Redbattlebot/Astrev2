FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies (SurrealDB & Go)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh

# Install Go 1.21
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy the entire project
COPY . .

# 3. Build the Economy Service (Using your specific steps)
RUN cd Economy && \
    mkdir -p data && \
    go mod download && \
    go build -o economy-service . && \
    # We move the binary to the root so Mercury Core finds it
    cp economy-service ../economy-service

# 4. Build the SvelteKit Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Public Networking Configuration
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
# This ensures the Go binary is visible to the framework
ENV GO_BINARY_PATH=/usr/local/go/bin/go

EXPOSE 10000
EXPOSE 8000

# 6. Start Command
WORKDIR /app/Site
CMD ["bun", "run", "build/index.js"]
