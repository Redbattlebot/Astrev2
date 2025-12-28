# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy the entire project
COPY . .

# Move into the Site directory and install/build
WORKDIR /app/Site
RUN bun install
RUN bun run build

# Set Environment Variables
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose the port
EXPOSE 10000

# THE "HARD" FIX: Using ENTRYPOINT with the absolute path to Bun
# This bypasses the $PATH entirely and forces Render to execute the binary.
ENTRYPOINT ["/usr/local/bin/bun", "build/index.js"]
