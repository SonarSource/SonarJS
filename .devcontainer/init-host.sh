#!/usr/bin/env bash
# Populates the Docker named volume dc-sonarjs-secrets with the corporate CA cert and ~/.npmrc.
# Runs as initializeCommand. Requires Docker CLI and a WSL2 context — open the folder in
# container from a WSL2 terminal so that $NODE_EXTRA_CA_CERTS and ~/.npmrc resolve correctly.

set -euo pipefail

VOLUME=dc-sonarjs-secrets

docker volume create "$VOLUME" > /dev/null

# Build mount list and copy commands for a single-pass helper container
MOUNTS=(-v "$VOLUME:/secrets")
CERT_CMD="touch /secrets/dc-cert.crt"
NPMRC_CMD="touch /secrets/dc-npmrc"

if [[ -n "${NODE_EXTRA_CA_CERTS:-}" && -f "$NODE_EXTRA_CA_CERTS" ]]; then
  MOUNTS+=("-v" "$NODE_EXTRA_CA_CERTS:/input/cert:ro")
  CERT_CMD="cp /input/cert /secrets/dc-cert.crt"
fi

if [[ -f "$HOME/.npmrc" ]]; then
  MOUNTS+=("-v" "$HOME/.npmrc:/input/npmrc:ro")
  NPMRC_CMD="cp /input/npmrc /secrets/dc-npmrc"
fi

docker run --rm "${MOUNTS[@]}" alpine sh -c "$CERT_CMD && $NPMRC_CMD"
