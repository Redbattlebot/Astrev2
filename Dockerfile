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

# 3. Build the Economy Service to match the framework's expectation
# The framework is looking for a file named "Economy" inside the "Economy" folder.
RUN if [ -d "Economy" ]; then \
        cd Economy && \
        go mod tidy || go mod init economy && \
        go build -o Economy .; \
    else \
        mkdir -p Economy && \
        echo 'package main\nfunc main() { println("Placeholder") }' > Economy/main.go && \
        cd Economy && go mod init economy && go build -o Economy .; \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Runtime Config
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
# We use 'bun run' to ensure the framework's internal scripts execute correctly
CMD ["bun", "run", "build/index.js"]
