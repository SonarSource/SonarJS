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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.scanner.ResourceFetcher;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;

class EmbeddedNodeTest {

  private static final String PLUGIN_KEY = "javascript";

  @TempDir
  Path tempDir;

  private ProcessWrapper successfulProcessWrapper() throws Exception {
    var processWrapper = mock(ProcessWrapper.class);
    when(processWrapper.startProcess(any(), any(), any(), any())).thenReturn(mock(Process.class));
    when(processWrapper.waitFor(any(), anyLong(), any())).thenReturn(true);
    when(processWrapper.exitValue(any())).thenReturn(0);
    return processWrapper;
  }

  private Environment linuxX64Environment(Path sonarUserHome) {
    var env = mock(Environment.class);
    when(env.getOsName()).thenReturn("Linux");
    when(env.getOsArch()).thenReturn("amd64");
    when(env.isAlpine()).thenReturn(false);
    when(env.getSonarUserHome()).thenReturn(sonarUserHome);
    return env;
  }

  /**
   * Pre-seeds a deployed runtime whose version already matches {@code /linux-x64/version.txt}, so {@code deploy()}
   * takes its "already up to date" branch and skips real extraction - the test fixture's {@code node.xz} is a
   * dummy, not actual XZ-compressed data, exactly like {@link EmbeddedNodeCleanupTest} relies on for its own
   * (failure-path) scenario.
   */
  private void seedUpToDateRuntime(Path sonarUserHome) throws Exception {
    var runtimeDir = sonarUserHome.resolve("js").resolve("node-runtime");
    Files.createDirectories(runtimeDir);
    Files.writeString(runtimeDir.resolve("node"), "pre-existing runtime binary");
    try (var versionInput = getClass().getResourceAsStream("/linux-x64/version.txt")) {
      assertThat(versionInput).isNotNull();
      Files.writeString(
        runtimeDir.resolve(EmbeddedNode.VERSION_FILENAME),
        new String(versionInput.readAllBytes(), StandardCharsets.UTF_8)
      );
    }
  }

  @Test
  void should_fetch_runtime_through_resource_fetcher_when_available() throws Exception {
    seedUpToDateRuntime(tempDir);
    var env = linuxX64Environment(tempDir);
    var resourceFetcher = mock(ResourceFetcher.class);
    when(resourceFetcher.fetch(eq(PLUGIN_KEY), eq("linux-x64/bin/node.xz"))).thenReturn(
      copyTestResource("/linux-x64/node.xz", "node.xz")
    );
    when(resourceFetcher.fetch(eq(PLUGIN_KEY), eq("linux-x64/version.txt"))).thenReturn(
      copyTestResource("/linux-x64/version.txt", "version.txt")
    );

    var embeddedNode = new EmbeddedNode(successfulProcessWrapper(), env, resourceFetcher);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(Files.exists(embeddedNode.binary())).isTrue();
    verify(resourceFetcher).fetch(PLUGIN_KEY, "linux-x64/bin/node.xz");
    verify(resourceFetcher).fetch(PLUGIN_KEY, "linux-x64/version.txt");
  }

  @Test
  void should_fall_back_to_classpath_when_resource_fetcher_is_unavailable() throws Exception {
    seedUpToDateRuntime(tempDir);
    var env = linuxX64Environment(tempDir);

    // No ResourceFetcher (SonarLint-side constructor): must read the runtime off the classpath, as before.
    var embeddedNode = new EmbeddedNode(successfulProcessWrapper(), env);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(Files.exists(embeddedNode.binary())).isTrue();
  }

  private Path copyTestResource(String classpathResource, String fileName) throws Exception {
    var target = tempDir.resolve("resource-fetcher-downloads").resolve(fileName);
    Files.createDirectories(target.getParent());
    try (var is = getClass().getResourceAsStream(classpathResource)) {
      assertThat(is).isNotNull();
      Files.copy(is, target);
    }
    return target;
  }
}
