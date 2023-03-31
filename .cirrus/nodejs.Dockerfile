ARG CIRRUS_AWS_ACCOUNT=275878209202
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j11-latest

USER root

RUN apt-get update && apt-get install -y nodejs=16.*

USER sonarsource
