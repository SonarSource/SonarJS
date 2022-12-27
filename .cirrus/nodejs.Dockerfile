ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j11-latest

USER root

ARG NODE_VERSION=v14.20.0

RUN  wget -U "nodejs" -q -O nodejs.tar.gz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz \
    && tar -xzf "nodejs.tar.gz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm nodejs.tar.gz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs

USER sonarsource
