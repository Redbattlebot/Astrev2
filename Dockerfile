FROM oven/bun:latest

WORKDIR /app

# 1. Install SurrealDB and Go
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy everything from your project
COPY . .

# 3. Build the Economy Service
# We go directly into the folder shown in your screenshot
WORKDIR /app/Economy
RUN go mod tidy
RUN go build -o economy-service .

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

# Point back to Site for the start command
WORKDIR /app/Site
CMD ["/usr/local/bin/bun", "build/index.js"]
