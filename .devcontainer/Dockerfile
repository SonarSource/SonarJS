FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

USER root

# Additional system packages (base already has curl, git, wget, ca-certificates)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        jq \
        rsync \
        unzip \
        vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install corporate CA certificates (place *.pem or *.crt files in .devcontainer/certs/ — they are gitignored)
COPY .devcontainer/certs/ /usr/local/share/ca-certificates/
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Install yq v4.45.1 (pinned to match vibe-bot reference environment)
ARG YQ_VERSION=4.45.1
RUN wget -qO /usr/local/bin/yq \
        "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_amd64" \
    && chmod +x /usr/local/bin/yq

# Install SonarScanner CLI 8.0.1.6346 (pinned to match vibe-bot reference environment)
ARG SONAR_SCANNER_VERSION=8.0.1.6346
ENV SONAR_SCANNER_HOME=/opt/sonar-scanner
RUN wget -qO /tmp/sonar-scanner.zip \
        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux-x64.zip" \
    && unzip -q /tmp/sonar-scanner.zip -d /opt \
    && mv "/opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux-x64" "${SONAR_SCANNER_HOME}" \
    && ln -s "${SONAR_SCANNER_HOME}/bin/sonar-scanner" /usr/local/bin/sonar-scanner \
    && rm /tmp/sonar-scanner.zip

# Install mise as node user
USER node
RUN curl https://mise.run | sh

# mise binary on PATH; shims dir for installed tools (java, mvn)
ENV PATH="/home/node/.local/bin:/home/node/.local/share/mise/shims:$PATH"

# Activate mise in both bash and zsh sessions (base image uses zsh by default)
RUN echo 'eval "$(mise activate bash)"' >> /home/node/.bashrc \
    && echo 'eval "$(mise activate zsh)"' >> /home/node/.zshrc
