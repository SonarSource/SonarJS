#------------------------------------------------------------------------------
# All the tools required to build mysql-migrator, including execution
# of integration tests.
#
# Build from the basedir:
#   docker build -f docker/Dockerfile-build -t mysql-migrator-build docker
#
# Verify the content of the image by running a shell session in it:
#   docker run -it mysql-migrator-build bash
#
# CirrusCI builds the image when needed. No need to manually upload it
# to Google Cloud Container Registry. See section "gke_container" of .cirrus.yml
#------------------------------------------------------------------------------

FROM maven:3.6-jdk-11

USER root

RUN apt-get update && apt-get -y install python3
RUN groupadd -r sonarsource && useradd -r -m -g sonarsource sonarsource

ENV NODE_VERSION v10.16.3

RUN  wget -U "nodejs" -q -O nodejs.tar.xz https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz \
    && tar -xJf "nodejs.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm nodejs.tar.xz \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs

# On cirrus context is set to the root of the repository
COPY .cirrus/settings.xml /usr/share/maven/conf/settings.xml

ENV MAVEN_CONFIG "/home/sonarsource/.m2"
USER sonarsource
