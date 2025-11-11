# SonarJS Docker Image
FROM node:20.12-alpine

WORKDIR /app

# Copy the bundled output from esbuild
COPY ./bin/ ./bin/
COPY package.json ./
COPY packages/bridge/src/openrpc-server.json ./

# Set environment variables
ENV NODE_ENV=production

# Expose default port (adjust if needed)
EXPOSE 3000

# Run the bundled server
CMD ["node", "./bin/server.cjs", "3000", "0.0.0.0"]

