FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy EVERYTHING (Don't try to name specific folders yet)
COPY . .

# 3. Flexible Economy Build
# This finds any folder named 'economy' regardless of uppercase/lowercase
RUN E_PATH=$(find . -maxdepth 2 -iname "economy" -type d | head -n 1) && \
    if [ -n "$E_PATH" ]; then \
        echo "Building Economy service in $E_PATH..." && \
        cd "$E_PATH" && \
        if [ ! -f go.mod ]; then go mod init economy; fi && \
        go mod tidy && \
        go build -o ../economy-service .; \
    else \
        echo "CRITICAL: Economy folder not found in repository!"; \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
CMD ["/usr/local/bin/bun", "build/index.js"]
