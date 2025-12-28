FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh

# Install Go
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy the project
COPY . .

# 3. Build Economy Service (Flexible Path)
# This will list files so we can see what's happening, then build
RUN ls -d */ && \
    E_DIR=$(find . -maxdepth 1 -iname "economy" -type d) && \
    cd "$E_DIR" && \
    mkdir -p data && \
    go mod download && \
    go build -o economy-service . && \
    cp economy-service ../economy-service

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Public Networking
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV GO_BINARY_PATH=/usr/local/go/bin/go
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
CMD ["bun", "run", "build/index.js"]
