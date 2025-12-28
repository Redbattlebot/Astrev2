# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy the entire repository into the container
COPY . .

# Move into the Site directory where package.json actually lives
WORKDIR /app/Site

# Install dependencies inside the Site folder
RUN bun install

# Build the SvelteKit app
RUN bun run build

# Set Environment Variables for Render
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose the port
EXPOSE 10000

# The command to start the server
# Since we are already in /app/Site, the path is build/index.js
CMD ["/usr/local/bin/bun", "build/index.js"]
