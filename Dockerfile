FROM oven/bun:latest

WORKDIR /app

# Copy everything
COPY . .

# Install and Build
WORKDIR /app/Site
RUN bun install
RUN bun run build

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

EXPOSE 10000

# Direct execution with absolute path - no lookups, no indirection
# We tell Bun exactly: "Execute this specific JavaScript file, right now"
CMD ["/usr/local/bin/bun", "build/index.js"]
