FROM gcr.io/language-team/base@sha256:80c92dd1e764e4d6f190abb98f77f69324d1d3881f87624166725d666a741860

USER root

ENV NODE_VERSION v10.16.3

RUN  wget -U "nodejs" -q -O nodejs.tar.xz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz \
    && tar -xJf "nodejs.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm nodejs.tar.xz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs

ENV YARN_VERSION 1.19.1

RUN curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
      && mkdir -p /opt \
      && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
      && ln -s /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
      && ln -s /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
      && rm yarn-v$YARN_VERSION.tar.gz


USER sonarsource
