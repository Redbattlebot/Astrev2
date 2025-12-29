FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Fake Surreal (to bypass Mercury's local startup check)
RUN echo '#!/bin/sh\necho "Cloud Link Active"\nsleep infinity' > /usr/local/bin/surreal \
    && chmod +x /usr/local/bin/surreal

# 3. Copy & Build Economy Service
COPY . .
RUN ACTUAL_ECONOMY=$(find . -maxdepth 2 -name "*conomy*" -type d | head -n 1) && \
    cd "$ACTUAL_ECONOMY" && \
    go build -o /app/Economy_Binary . && \
    chmod +x /app/Economy_Binary

# 4. Build SvelteKit
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Production Environment
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com 

EXPOSE 10000

# 6. Launch Sequence
# We use pkill to make sure no old Economy services are stuck, then start fresh
CMD pkill Economy_Binary || true && /app/Economy_Binary & bun run build/index.js
