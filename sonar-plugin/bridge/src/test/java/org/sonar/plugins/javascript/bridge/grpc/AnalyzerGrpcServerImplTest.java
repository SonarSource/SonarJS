/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge.grpc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.bridge.AnalysisLogParity;

class AnalyzerGrpcServerImplTest {

  @Test
  void should_recognize_shared_discovery_logs() {
    assertThat(
      AnalyzerGrpcServerImpl.isSharedDiscoveryLog(
        "Found 1 tsconfig.json file(s): [/tmp/project/tsconfig.json]"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isSharedDiscoveryLog(
        "Analyzing 2 file(s) using default options [lib: lib.es2024.d.ts, lib.dom.d.ts]"
      )
    ).isFalse();
  }

  @Test
  void should_recognize_analysis_parity_logs() {
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Found 1 tsconfig.json file(s): [/tmp/project/tsconfig.json]"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Analyzing 2 file(s) using default options [lib: lib.es2024.d.ts, lib.dom.d.ts]"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Creating TypeScript(7.0.0-dev) program with configuration file /tmp/project/tsconfig.json [lib: lib.es2024.d.ts, lib.dom.d.ts]"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Analyzing 1 file(s) from tsconfig /tmp/project/tsconfig.json (3 total files in program)"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "No files to analyze from tsconfig /tmp/project/tsconfig.json"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Skipping TypeScript program creation for 2 orphan file(s) (sonar.javascript.createTSProgramForOrphanFiles=false)"
      )
    ).isTrue();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(AnalysisLogParity.TYPE_CHECKING_DISABLED_LOG)
    ).isTrue();
  }

  @Test
  void should_ignore_non_parity_runtime_logs() {
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog("jsts-go gRPC server listening on port 12345")
    ).isFalse();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "AnalyzeProject: baseDir=/tmp/project, files=2, jsTsFiles=2, rules=1, tsconfigs=1, disableTypeChecking=false"
      )
    ).isFalse();
    assertThat(
      AnalyzerGrpcServerImpl.isParityAnalysisLog(
        "Internal diagnostic in /tmp/project/tsconfig.json: Invalid tsconfig"
      )
    ).isFalse();
  }
}
