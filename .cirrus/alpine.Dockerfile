ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j17-latest AS base

FROM eclipse-temurin:17-alpine

ENV USER=sonarsource
ENV GROUPNAME=$USER
ENV UID=1000
ENV GID=1000

# copy maven scripts from base image
COPY --from=base /usr/local/bin /usr/local/bin

# Maven
COPY --from=base /usr/local/share/maven /usr/local/share/maven
RUN ln -sf /usr/local/share/maven/bin/mvn /usr/local/bin/mvn
ENV MAVEN_CONFIG="/home/sonarsource/.m2"

RUN addgroup \
    --gid "$GID" \
    "$GROUPNAME" \
&&  adduser \
    --disabled-password \
    --home /home/sonarsource \
    --ingroup "$GROUPNAME" \
    --uid "$UID" \
    $USER


RUN mkdir -p /home/sonarsource/.m2
RUN chown -R sonarsource:sonarsource /home/sonarsource/.m2
# copy maven settings from base image
COPY --from=base --chown=sonarsource:sonarsource /home/sonarsource/.m2/* /home/sonarsource/.m2/

RUN apk add bash --no-cache

USER sonarsource
WORKDIR /home/sonarsource
