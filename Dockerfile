FROM oven/bun:latest

WORKDIR /app

# 1. Install SurrealDB and Go (as root)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -sSf https://install.surrealdb.com | sh
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. FORCE COPY the Economy folder
# This bypasses .dockerignore for this specific path
COPY ./Economy ./Economy
COPY . .

# 3. Build the Economy binary exactly where Mercury expects it
RUN cd Economy && \
    if [ ! -f go.mod ]; then go mod init economy; fi && \
    go mod tidy && \
    go build -o ../economy-service .

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
CMD ["/usr/local/bin/bun", "build/index.js"]
