# 1. Use Bun as the base
FROM oven/bun:latest

WORKDIR /app

# 2. Install SurrealDB AND Go (as root)
USER root
RUN apt-get update && apt-get install -y curl git
# Install SurrealDB
RUN curl -sSf https://install.surrealdb.com | sh
# Install Go 1.21+ (Required for the Economy service)
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 3. Pre-build the Economy service
# This prevents the app from trying to build it at runtime
COPY . .
WORKDIR /app/Economy
RUN go build -o economy-service .

# 4. Build the Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Final Environment & Ports
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
EXPOSE 10000
EXPOSE 8000

WORKDIR /app/Site
# 6. Start the main app
CMD ["/usr/local/bin/bun", "build/index.js"]
