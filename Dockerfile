# SonarJS Docker Image
FROM node:24-alpine

WORKDIR /app

# Copy the bundled output from esbuild
COPY ./bin/ ./bin/
COPY package.json ./
COPY packages/bridge/src/openrpc-server.json ./

# Expose default port (adjust if needed)
EXPOSE 3000

# Run the bundled server
CMD ["node", "./bin/server.cjs", "3000", "0.0.0.0"]

