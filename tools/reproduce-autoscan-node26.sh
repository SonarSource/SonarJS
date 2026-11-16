#!/usr/bin/env bash
set -euo pipefail

image=${1:?Pass the Autoscan image reference}
root=${2:?Pass the absolute directory containing runtimes/node-24 and runtimes/node-26}
mkdir -p "$root/results"

docker pull --platform linux/amd64 "$image"
docker image inspect "$image" --format '{{json .RepoDigests}}' \
  | python3 -c 'import json, sys; print(json.dumps([value.rsplit("@", 1)[-1] for value in json.load(sys.stdin)]))' \
  | tee "$root/results/image-digests.json"

# Keep the unmodified image free of diagnostic package installations.
docker run --rm --platform linux/amd64 --network none --user 0 \
  --volume "$root/runtimes:/reproduction:ro" --entrypoint /bin/bash "$image" -c '
    set -euo pipefail
    cat /etc/os-release
    uname -m
    if command -v node; then
      echo "Unexpected host Node: use an image without system Node" >&2
      exit 1
    fi
    if rpm -q libatomic; then
      echo "Image already includes libatomic; it cannot reproduce the incident" >&2
      exit 1
    fi
    /reproduction/node-24 --version
    ldd /reproduction/node-26
    if output=$(/reproduction/node-26 --version 2>&1); then
      echo "Unexpected success: Node 26 starts without installing libatomic" >&2
      exit 1
    else
      status=$?
    fi
    printf "Node 26 exit code: %s\n%s\n" "$status" "$output"
    printf "%s\n" "$output" | grep -F "libatomic.so.1"
    echo "PASS: Node 24 starts; Node 26 fails because libatomic.so.1 is missing"
  ' 2>&1 | tee "$root/results/before-libatomic.log"

# This is a fresh, disposable container from the same image. Install only
# libatomic as the diagnostic intervention; do not update the base image.
docker run --rm --platform linux/amd64 --user 0 \
  --volume "$root/runtimes:/reproduction:ro" --entrypoint /bin/bash "$image" -c '
    set -euo pipefail
    rpm -qa | sort > /tmp/packages-before
    dnf install -y libatomic
    rpm -qa | sort > /tmp/packages-after
    echo "Package changes:"
    diff -u /tmp/packages-before /tmp/packages-after || test "$?" -eq 1
    rpm -q libatomic
    ldd /reproduction/node-26
    test "$(/reproduction/node-26 --version)" = "v26.13.1"
    /reproduction/node-26 -e '\''const assert = require("node:assert/strict"); const { Worker } = require("node:worker_threads"); new Worker("require(\"node:worker_threads\").parentPort.postMessage(42)", { eval: true }).once("message", value => { assert.equal(value, 42); console.log("Node 26 worker thread completed"); });'\''
    echo "PASS: the same Node 26 binary starts after installing libatomic"
  ' 2>&1 | tee "$root/results/after-libatomic.log"
