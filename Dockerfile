# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy the entire project first
COPY . .

# Install dependencies for the whole project
RUN bun install

# Move into the Site directory and build the SvelteKit app
WORKDIR /app/Site
RUN bun run build

# Set Environment Variables for Render
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose the port
EXPOSE 10000

# THE FIX: Use the absolute path to Bun and point to the built index.js
# This avoids the "$PATH" error entirely.
CMD ["/usr/local/bin/bun", "build/index.js"]
