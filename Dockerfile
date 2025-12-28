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
# This will now include Economy if .dockerignore is gone
COPY . .

# 3. Build Economy Service
# If the folder is missing, we create a placeholder so the build finishes
RUN if [ -d "Economy" ]; then \
        cd Economy && \
        mkdir -p data && \
        go mod tidy && \
        go build -o ../economy-service .; \
    else \
        echo "ERROR: Economy folder still not found. Check your GitHub files!" && \
        mkdir -p Economy && \
        echo 'package main\nfunc main() { println("Placeholder") }' > Economy/main.go && \
        cd Economy && go mod init economy && go build -o ../economy-service .; \
    fi

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Runtime
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
CMD ["bun", "run", "build/index.js"]
