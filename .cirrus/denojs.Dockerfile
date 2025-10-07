ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j17-latest

USER root

ARG DENO_VERSION=2.5.3

RUN apt-get update \
    && apt-get install -y ca-certificates curl unzip \
    && curl -fsSL https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip -o deno.zip \
    && unzip deno.zip -d /usr/local/bin \
    && rm deno.zip \
    && chmod +x /usr/local/bin/deno \
    && apt-get clean \
    && deno --version

USER sonarsource
