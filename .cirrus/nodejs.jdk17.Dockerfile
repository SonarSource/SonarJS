ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j17-latest

USER root

ARG NODE_VERSION=14

RUN apt-get update && apt-get install -y nodejs=${NODE_VERSION}.*

USER sonarsource
