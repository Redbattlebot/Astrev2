# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy everything
COPY . .

# Move to Site and install/build
WORKDIR /app/Site
RUN bun install
RUN bun run build

# Set Environment Variables
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Expose the port
EXPOSE 10000

# THE CHANGE: Use "Shell" format instead of ["JSON", "format"]
# This forces the container to find bun automatically.
CMD bun build/index.js
