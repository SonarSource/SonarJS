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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;

class EmbeddedNodeCleanupTest {

  @TempDir
  Path tempDir;

  @Test
  void should_cleanup_deployed_runtime_when_node_validation_fails() throws Exception {
    var processWrapper = mock(ProcessWrapper.class);
    when(processWrapper.startProcess(any(), any(), any(), any())).thenReturn(mock(Process.class));
    when(processWrapper.waitFor(any(), anyLong(), any())).thenReturn(true);
    when(processWrapper.exitValue(any())).thenReturn(1);

    var env = mock(Environment.class);
    when(env.getOsName()).thenReturn("Linux");
    when(env.getOsArch()).thenReturn("amd64");
    when(env.isAlpine()).thenReturn(false);
    when(env.getSonarUserHome()).thenReturn(tempDir);

    var embeddedNode = new EmbeddedNode(processWrapper, env);
    var runtimeDir = tempDir.resolve("js").resolve("node-runtime");
    var runtimeBinary = runtimeDir.resolve("node");
    var runtimeVersion = runtimeDir.resolve(EmbeddedNode.VERSION_FILENAME);
    Files.createDirectories(runtimeDir);
    Files.writeString(runtimeBinary, "broken");
    try (var versionInput = getClass().getResourceAsStream("/linux-x64/version.txt")) {
      assertThat(versionInput).isNotNull();
      Files.writeString(
        runtimeVersion,
        new String(versionInput.readAllBytes(), StandardCharsets.UTF_8)
      );
    }

    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isFalse();
    assertThat(Files.exists(runtimeBinary)).isFalse();
    assertThat(Files.exists(runtimeVersion)).isFalse();
    verify(processWrapper).startProcess(any(), any(), any(), any());
  }
}
