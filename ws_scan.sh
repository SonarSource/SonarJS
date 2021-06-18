#! /usr/bin/env bash

set -euox pipefail

readonly URL="https://unified-agent.s3.amazonaws.com/wss-unified-agent.jar"
readonly UNIFIED_AGENT_JAR="wss-unified-agent.jar"
readonly X_MODULE_ANALYZER_JAR="xModuleAnalyzer-21.4.1.jar"
readonly MD5_CHECKSUM="8E51FDC3C9EF7FCAE250737BD226C8F6"
readonly SETUP_FILE="setupFile.txt"

get_ws_agent() {
  if [[ ! -f "${UNIFIED_AGENT_JAR}" ]]; then
    curl \
      --location \
      --remote-name \
      --remote-header-name \
      "${URL}"
  fi
  if [[ ! -f "${UNIFIED_AGENT_JAR}" ]]; then
    echo "Could not find downloaded Unified Agent" >&2
    exit 1
  fi

  # Verify JAR checksum
  local checksum="$(md5sum ${UNIFIED_AGENT_JAR} | cut --delimiter=" " --fields=1 | awk ' {print toupper($0) }')"
  if [[ "${checksum}" != "${MD5_CHECKSUM}" ]]; then
    echo -e "MD5 checksum mismatch.\nexpected: ${MD5_CHECKSUM}\ncomputed: ${checksum}" >&2
    exit 2
  fi

  # Verify JAR signature
  if ! jarsigner -verify "${UNIFIED_AGENT_JAR}"; then
    echo "Could not verify jar signature" >&2
    exit 3
  fi
}

get_xModuleAnalyzer() {
  local url="https://unified-agent.s3.amazonaws.com/xModuleAnalyzer/${X_MODULE_ANALYZER_JAR}"
  curl \
    --location \
    --remote-name \
    --remote-header-name \
    "${url}"

   if [[ ! -f "${X_MODULE_ANALYZER_JAR}" ]]; then
    echo "Could not find downloaded Unified Agent" >&2
    exit 1
  fi

}

scan() {
  export WS_PRODUCTNAME=$(maven_expression "project.name")
  export WS_PROJECTNAME="${WS_PRODUCTNAME} ${PROJECT_VERSION%.*}"
  echo "${WS_PRODUCTNAME} - ${WS_PROJECTNAME}"
  java -jar ${UNIFIED_AGENT_JAR} -d "${PWD}" -analyzeMultiModule ${SETUP_FILE}
  cat ${SETUP_FILE}
  java -jar ${X_MODULE_ANALYZER_JAR} -xModulePath ${SETUP_FILE} -fsaJarPath ${UNIFIED_AGENT_JAR} -c wss-unified-agent.config -aggregateModules True -logPath /tmp/ws_logs
}

get_ws_agent
get_xModuleAnalyzer
scan
