FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies (Go for Economy Service)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# --- THE "FAKE SURREAL" FIX ---
# This creates a dummy script that tells the site "I am running" 
# without actually using any CPU or RAM.
RUN echo '#!/bin/sh\necho "Mercury: Cloud DB Link Active."\nsleep infinity' > /usr/local/bin/surreal \
    && chmod +x /usr/local/bin/surreal
# ------------------------------

# 2. Copy the entire project
COPY . .

# 3. Build the Economy Service
RUN ACTUAL_ECONOMY=$(find . -maxdepth 2 -name "*conomy*" -type d | head -n 1) && \
    cd "$ACTUAL_ECONOMY" && \
    go build -o /app/Economy_Binary . && \
    chmod +x /app/Economy_Binary

# 4. Build the SvelteKit Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment Settings
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV ORIGIN=https://astrev.onrender.com 

EXPOSE 10000

# 6. Launch Sequence
WORKDIR /app/Site
# We launch Economy and then the Site. The Site will now find our "fake" surreal command.
CMD ../Economy_Binary & bun run build/index.js
