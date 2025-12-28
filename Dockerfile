FROM oven/bun:latest

WORKDIR /app

# 1. Install SurrealDB (as root)
USER root
RUN apt-get update && apt-get install -y curl
RUN curl -sSf https://install.surrealdb.com | sh

# 2. Fix the Symlink path 
# (The installer usually puts the binary in /root/.surrealdb/bin/surreal)
RUN ln -s /root/.surrealdb/bin/surreal /usr/local/bin/surreal

# 3. Copy everything (while still root to ensure permissions)
COPY . .

# 4. Install and Build
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment variables
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose Web and Database ports
EXPOSE 10000
EXPOSE 8000

# 6. Direct execution
# Staying as root ensures SurrealDB can start successfully
CMD ["/usr/local/bin/bun", "build/index.js"]
