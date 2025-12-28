FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies (SurrealDB & Go)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh

# Install Go 1.21 for the Economy Service
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy the entire project
COPY . .

# 3. Build the Economy Service
# Since the folder is confirmed at the root, we run the build directly.
RUN cd Economy && \
    mkdir -p data && \
    go mod tidy || (go mod init economy && go mod tidy) && \
    go build -o Economy . && \
    chmod +x Economy

# 4. Build the SvelteKit Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Public Networking & Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV GO_BINARY_PATH=/usr/local/go/bin/go

# Open ports for Site (10000) and SurrealDB (8000)
EXPOSE 10000
EXPOSE 8000

# 6. Launch the application
WORKDIR /app/Site
CMD ["bun", "run", "build/index.js"]
