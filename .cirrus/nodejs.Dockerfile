FROM eu.gcr.io/release-engineering-ci-staging/base:j11-latest

USER root

ARG NODE_VERSION=v12.22.0

RUN  wget -U "nodejs" -q -O nodejs.tar.gz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz \
    && tar -xzf "nodejs.tar.gz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm nodejs.tar.gz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs

USER sonarsource
