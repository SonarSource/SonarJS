ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j17-latest

USER root

ARG NODE_VERSION=20.12.0
ARG DENO_VERSION=2.5.3

RUN apt-get update \
    && apt-get install -y ca-certificates curl unzip xz-utils \
    && curl -fsSL https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip -o deno.zip \
    && unzip deno.zip -d /usr/local/bin \
    && rm deno.zip \
    && chmod +x /usr/local/bin/deno \
    && deno --version \
    && curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o node.tar.xz \
    && tar -xJf node.tar.xz -C /usr/local --strip-components=1 \
    && rm node.tar.xz \
    && apt-get clean \
    && node -v \
    && npm -v \

USER sonarsource
