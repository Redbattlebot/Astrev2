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

# 3. Conditional Economy Build
# We check if the folder exists first. If it doesn't, we skip it
# so the Site can still finish building.
RUN if [ -d "Economy" ]; then \
        cd Economy && \
        if [ ! -f go.mod ]; then go mod init economy; fi && \
        go mod tidy && \
        go build -o economy .; \
    else \
        echo "Economy folder not found in build context. Skipping Go build."; \
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
