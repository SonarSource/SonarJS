# SonarJS Docker Image
FROM node:24-alpine

WORKDIR /app

# Copy the bundled output from esbuild
COPY ./bin/ ./bin/
COPY package.json ./

# Expose gRPC port to match proxy service expectations
EXPOSE 50051

# Run the bundled server on port 50051
CMD ["node", "./bin/grpc-server.cjs", "50051"]

