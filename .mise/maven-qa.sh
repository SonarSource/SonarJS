#!/usr/bin/env bash
set -euo pipefail

orchestrator=()
if [[ -n ${ORCHESTRATOR_CONFIG_URL:-} ]]; then
  orchestrator+=("-Dorchestrator.configUrl=$ORCHESTRATOR_CONFIG_URL")
fi
if [[ -n ${ORCHESTRATOR_HOME:-} ]]; then
  orchestrator+=("-Dorchestrator.home=$ORCHESTRATOR_HOME")
fi

suite=$1
tests=${ITS_TESTS:-}
case "$suite" in
  fast-without-node) tests=${ITS_TESTS:-'!EslintCustomRulesTest'} ;;
  embedded-node)
    if command -v node; then
      echo 'The embedded Node.js check must not have system Node.js on PATH.' >&2
      exit 1
    fi
    tests=EmbeddedNodeTest
    ;;
  ruling) tests=RulingTest ;;
  *) ;;
esac

args=(-DskipTests=false "-Dsonar.runtimeVersion=${SONAR_RUNTIME_VERSION:-LATEST_RELEASE}" -B -e -V)
if [[ -n $tests ]]; then
  args+=("-Dtest=$tests")
fi

plugin=its/plugin
package_flags=()
if [[ ${SONARJS_ARTIFACT:-} == linux-x64-musl ]]; then
  package_flags+=(-B)
fi
case "$suite" in
  sonarlint)
    mvn ${orchestrator[@]+"${orchestrator[@]}"} -f "$plugin/sonarlint-tests/pom.xml" "${args[@]}" verify surefire-report:report
    ;;
  plugin)
    mvn package -f "$plugin/plugins/consumer-plugin/pom.xml" ${package_flags[@]+"${package_flags[@]}"}
    mvn ${orchestrator[@]+"${orchestrator[@]}"} -f "$plugin/tests/pom.xml" "${args[@]}" verify surefire-report:report
    ;;
  fast|fast-without-node)
    if [[ $suite == fast-without-node ]]; then
      package_flags+=(--projects '!org.sonarsource.javascript:eslint-custom-rules-plugin')
    fi
    mvn package -f "$plugin/plugins/pom.xml" ${package_flags[@]+"${package_flags[@]}"}
    mvn ${orchestrator[@]+"${orchestrator[@]}"} -f "$plugin/fast-tests/pom.xml" "${args[@]}" verify surefire-report:report
    ;;
  embedded-node)
    mvn ${orchestrator[@]+"${orchestrator[@]}"} -f "$plugin/fast-tests/pom.xml" "${args[@]}" verify
    ;;
  ruling)
    # Cap parallelism to avoid overwhelming the shared SonarQube/Node workload.
    cd its/ruling
    mvn ${orchestrator[@]+"${orchestrator[@]}"} test "${args[@]}" \
      -Dmaven.test.redirectTestOutputToFile=false \
      -Djunit.jupiter.execution.parallel.config.strategy=fixed \
      -Djunit.jupiter.execution.parallel.config.fixed.parallelism=8
    ;;
  *)
    echo "Unknown integration suite: $suite" >&2
    exit 1
    ;;
esac
