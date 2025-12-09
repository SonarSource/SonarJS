# SonarJS Docker Image
FROM node:24-alpine

WORKDIR /app

# Copy the bundled output from esbuild
COPY ./bin/ ./bin/
COPY package.json ./

# Expose default port (adjust if needed)
EXPOSE 3000

# Run the bundled server
CMD ["node", "./bin/grpc-server.cjs", "3000"]

