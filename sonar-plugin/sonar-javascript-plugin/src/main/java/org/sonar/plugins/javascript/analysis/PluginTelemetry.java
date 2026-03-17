/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.ProjectAnalysisTelemetry;
import org.sonar.plugins.javascript.bridge.BridgeServer.RuntimeTelemetry;

public class PluginTelemetry {

  private static final Logger LOG = LoggerFactory.getLogger(PluginTelemetry.class);
  private static final String KEY_PREFIX = "javascript.";
  private static final String RUNTIME_PREFIX = KEY_PREFIX + "runtime.";
  private static final String TELEMETRY_PREFIX = KEY_PREFIX + "telemetry.";

  private final BridgeServer server;
  private final JsTsContext<?> ctx;

  @Nullable
  private final ProjectAnalysisTelemetry projectAnalysisTelemetry;

  public PluginTelemetry(
    JsTsContext<?> ctx,
    BridgeServer server,
    @Nullable ProjectAnalysisTelemetry projectAnalysisTelemetry
  ) {
    this.ctx = ctx;
    this.server = server;
    this.projectAnalysisTelemetry = projectAnalysisTelemetry;
  }

  void reportTelemetry() {
    if (ctx.isSonarLint()) {
      // Not enabled for SonarLint
      return;
    }
    var isTelemetrySupported = ctx
      .getSensorContext()
      .runtime()
      .getApiVersion()
      .isGreaterThanOrEqual(Version.create(10, 9));
    if (!isTelemetrySupported) {
      // addTelemetryProperty is added in 10.9:
      // https://github.com/SonarSource/sonar-plugin-api/releases/tag/10.9.0.2362
      return;
    }
    var keyMapToSave = new HashMap<String, String>();
    addRuntimeTelemetry(keyMapToSave, server.getTelemetry().runtimeTelemetry());
    addProjectAnalysisTelemetry(keyMapToSave, projectAnalysisTelemetry);
    if (!keyMapToSave.isEmpty()) {
      keyMapToSave.forEach(ctx.getSensorContext()::addTelemetryProperty);
      LOG.debug("Telemetry saved: {}", keyMapToSave);
    }
  }

  private static void addRuntimeTelemetry(
    Map<String, String> keyMapToSave,
    @Nullable RuntimeTelemetry runtimeTelemetry
  ) {
    if (runtimeTelemetry == null) {
      return;
    }
    keyMapToSave.put(
      RUNTIME_PREFIX + "node-executable-origin",
      runtimeTelemetry.nodeExecutableOrigin()
    );
    keyMapToSave.put(RUNTIME_PREFIX + "version", runtimeTelemetry.version().toString());
    keyMapToSave.put(
      RUNTIME_PREFIX + "major-version",
      Integer.toString(runtimeTelemetry.version().major())
    );
  }

  private static void addProjectAnalysisTelemetry(
    Map<String, String> keyMapToSave,
    @Nullable ProjectAnalysisTelemetry projectAnalysisTelemetry
  ) {
    if (projectAnalysisTelemetry == null) {
      return;
    }
    addValueList(
      keyMapToSave,
      TELEMETRY_PREFIX + "typescript.versions",
      projectAnalysisTelemetry.typescriptVersions()
    );
    keyMapToSave.put(
      TELEMETRY_PREFIX + "typescript.native-preview",
      Boolean.toString(projectAnalysisTelemetry.typescriptNativePreview())
    );

    projectAnalysisTelemetry
      .compilerOptions()
      .forEach((option, values) -> addCompilerOptionTelemetry(keyMapToSave, option, values));

    addValueList(
      keyMapToSave,
      TELEMETRY_PREFIX + "ecmascript.versions",
      projectAnalysisTelemetry.ecmaScriptVersions()
    );

    var programCreation = projectAnalysisTelemetry.programCreation();
    if (programCreation != null) {
      keyMapToSave.put(
        TELEMETRY_PREFIX + "typescript.program-creation.attempted",
        Integer.toString(programCreation.attempted())
      );
      keyMapToSave.put(
        TELEMETRY_PREFIX + "typescript.program-creation.succeeded",
        Integer.toString(programCreation.succeeded())
      );
      keyMapToSave.put(
        TELEMETRY_PREFIX + "typescript.program-creation.failed",
        Integer.toString(programCreation.failed())
      );
    }
  }

  private static void addCompilerOptionTelemetry(
    Map<String, String> keyMapToSave,
    String option,
    @Nullable List<String> values
  ) {
    if (option.isBlank()) {
      return;
    }
    addValueList(keyMapToSave, TELEMETRY_PREFIX + "typescript.compiler-options." + option, values);
  }

  private static void addValueList(
    Map<String, String> keyMapToSave,
    String key,
    @Nullable List<String> values
  ) {
    if (values == null || values.isEmpty()) {
      return;
    }
    var value = values
      .stream()
      .filter(v -> v != null && !v.isBlank())
      .distinct()
      .sorted()
      .collect(Collectors.joining(","));
    if (!value.isEmpty()) {
      keyMapToSave.put(key, value);
    }
  }
}
