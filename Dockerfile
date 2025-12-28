# Step 1: Base Image
FROM oven/bun:latest AS base
WORKDIR /app

# Step 2: Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY Site/package.json Site/bun.lockb* Site/bun.lock /temp/prod/
# We use || true in case bun.lock doesn't exist yet
RUN cd /temp/prod && bun install --frozen-lockfile || bun install

# Step 3: Release Image
FROM oven/bun:latest AS release
WORKDIR /app

# Copy dependencies and source code
COPY --from=install /temp/prod/node_modules /app/Site/node_modules
COPY Assets /app/Assets
COPY Site /app/Site
COPY mercury.core.ts /app/mercury.core.ts

# Build the app inside the Site directory
WORKDIR /app/Site
RUN bun run build

# Expose the port
EXPOSE 10000

# Set environment variable to ensure it listens on all interfaces
ENV HOST=0.0.0.0
ENV PORT=10000

# The Final Start Command
# Using the absolute path to bun prevents the $PATH error
CMD ["/usr/local/bin/bun", "run", "build/index.js"]
