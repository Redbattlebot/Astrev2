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

# 3. Build the Economy Service with strict permissions
RUN if [ -d "Economy" ]; then \
        cd Economy && \
        mkdir -p data && \
        go mod tidy || go mod init economy && \
        go build -o Economy . && \
        # CRITICAL: Grant execution permissions
        chmod +x Economy; \
    else \
        mkdir -p Economy/data && \
        echo 'package main\nimport "fmt"\nfunc main() { fmt.Println("Placeholder running") }' > Economy/main.go && \
        cd Economy && go mod init economy && go build -o Economy . && \
        chmod +x Economy; \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Runtime Config
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
# Force Mercury to see the Go installation if it tries to rebuild
ENV GO_BINARY_PATH=/usr/local/go/bin/go

EXPOSE 10000
EXPOSE 8000

# 6. Final Start
WORKDIR /app/Site
CMD ["bun", "run", "build/index.js"]
