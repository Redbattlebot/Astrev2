# 1. Use the official Bun image
FROM oven/bun:latest

# 2. Set the working directory to /app
WORKDIR /app

# 3. Copy EVERYTHING from your GitHub into the container
COPY . .

# 4. Move into the Site folder where the actual website code is
WORKDIR /app/Site

# 5. Install the dependencies
RUN bun install

# 6. Build the SvelteKit project (creates the /build folder)
RUN bun run build

# 7. Set necessary Environment Variables for Render
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# 8. Tell Render which port to look at
EXPOSE 10000

# 9. THE START COMMAND (The Full Path Fix)
# This points directly to the bun engine and the built index file
CMD ["/usr/local/bin/bun", "run", "build/index.js"]
