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

package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.IOException;
import javax.annotation.Nullable;
import org.sonar.api.Startable;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectUnaryResponse;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public interface BridgeServer extends Startable {
  void startServerLazily(BridgeServerConfig context) throws IOException;

  void clean() throws InterruptedException;

  String getCommandInfo();

  boolean isAlive();

  TelemetryData getTelemetry();

  void analyzeProject(ProjectAnalysisHandler handler);

  AnalyzeProjectUnaryResponse analyzeProject(AnalyzeProjectRequest request) throws IOException;

  record TelemetryData(@Nullable RuntimeTelemetry runtimeTelemetry) {}

  record RuntimeTelemetry(Version version, String nodeExecutableOrigin) {}
}
