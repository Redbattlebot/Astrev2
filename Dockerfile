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

# THE FINAL FIX: 
# We use the shell form (no brackets) to let the OS find Bun.
# We point to the build folder created by the Svelte adapter.
WORKDIR /app/Site
CMD bun build/index.js
