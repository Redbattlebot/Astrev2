FROM oven/bun:latest

WORKDIR /app

# 1. Install System Dependencies (Go for Economy Service)
USER root
RUN apt-get update && apt-get install -y curl git
RUN curl -LO https://go.dev/dl/go1.21.6.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# 2. Copy the entire project
COPY . .

# 3. Build the Economy Service
RUN ACTUAL_ECONOMY=$(find . -maxdepth 2 -name "*conomy*" -type d | head -n 1) && \
    echo "Found Economy folder at: $ACTUAL_ECONOMY" && \
    cd "$ACTUAL_ECONOMY" && \
    mkdir -p data && \
    go mod tidy || (go mod init economy && go mod tidy) && \
    go build -o Economy . && \
    chmod +x Economy && \
    cp Economy /app/Economy_Binary 

# 4. Build the SvelteKit Site
WORKDIR /app/Site
RUN bun install
RUN bun run build

# 5. Environment Settings
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
# This tells SvelteKit your cloud origin to prevent 502/CSRF errors
ENV ORIGIN=https://astrev.onrender.com 

EXPOSE 10000

# 6. Launch Sequence
# We run the Economy binary in the background and start the Site
WORKDIR /app/Site
CMD ../Economy_Binary & bun run build/index.js
