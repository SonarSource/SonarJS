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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.event.Level;
import org.sonar.api.scanner.ResourceFetcher;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.tukaani.xz.LZMA2Options;
import org.tukaani.xz.XZOutputStream;

class EmbeddedNodeTest {

  private static final String PLUGIN_KEY = "javascript";

  @RegisterExtension
  public final LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @TempDir
  Path tempDir;

  static Stream<Arguments> platforms() {
    return Stream.of(
      Arguments.of(
        "Windows 11",
        "amd64",
        false,
        Platform.WIN_X64,
        "win-x64/node.exe.xz",
        "win-x64/version.txt",
        "node.exe"
      ),
      Arguments.of(
        "Linux",
        "aarch64",
        false,
        Platform.LINUX_ARM64,
        "linux-arm64/bin/node.xz",
        "linux-arm64/version.txt",
        "node"
      ),
      Arguments.of(
        "Linux",
        "amd64",
        false,
        Platform.LINUX_X64,
        "linux-x64/bin/node.xz",
        "linux-x64/version.txt",
        "node"
      ),
      Arguments.of(
        "Linux",
        "amd64",
        true,
        Platform.LINUX_X64_MUSL,
        "linux-x64-musl/bin/node.xz",
        "linux-x64-musl/version.txt",
        "node"
      ),
      Arguments.of(
        "Mac OS X",
        "aarch64",
        false,
        Platform.DARWIN_ARM64,
        "darwin-arm64/bin/node.xz",
        "darwin-arm64/version.txt",
        "node"
      ),
      Arguments.of(
        "Mac OS X",
        "amd64",
        false,
        Platform.DARWIN_X64,
        "darwin-x64/bin/node.xz",
        "darwin-x64/version.txt",
        "node"
      ),
      Arguments.of("FreeBSD", "amd64", false, Platform.UNSUPPORTED, "", "", "node")
    );
  }

  @ParameterizedTest
  @MethodSource("platforms")
  void should_detect_platform_and_resolve_resource_paths(
    String osName,
    String osArch,
    boolean alpine,
    Platform expected,
    String archivePath,
    String versionPath,
    String binary
  ) {
    var env = mock(Environment.class);
    when(env.getOsName()).thenReturn(osName);
    when(env.getOsArch()).thenReturn(osArch);
    when(env.isAlpine()).thenReturn(alpine);

    var platform = Platform.detect(env);

    assertThat(platform).isEqualTo(expected);
    assertThat(platform.archiveResourcePath()).isEqualTo(archivePath);
    assertThat(platform.versionResourcePath()).isEqualTo(versionPath);
    assertThat(platform.binary()).isEqualTo(binary);
  }

  @Test
  void should_log_debug_message_when_embedded_node_is_not_found() throws Exception {
    logTester.setLevel(Level.DEBUG);
    var env = linuxX64Environment(tempDir);

    var embeddedNode = new UnavailableEmbeddedNode(successfulProcessWrapper(), env);
    embeddedNode.deploy();

    assertThat(logTester.logs(Level.DEBUG)).contains(
      "Embedded node not found for platform LINUX_X64"
    );
    assertThat(embeddedNode.isAvailable()).isFalse();
  }

  @Test
  void should_extract_runtime_and_version_when_nothing_is_deployed() throws Exception {
    var env = hostEnvironment();
    var resourceFetcher = resourceFetcherFor(hostArchivePath(), hostVersionPath(), "v1");

    var embeddedNode = new ScannerEmbeddedNode(successfulProcessWrapper(), env, resourceFetcher);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(Files.readString(embeddedNode.binary())).isEqualTo("node-binary-v1");
    assertThat(
      Files.readString(deployDirectory().resolve(EmbeddedNode.VERSION_FILENAME))
    ).isEqualTo("v1");
    if (!isWindowsHost()) {
      assertThat(Files.getPosixFilePermissions(embeddedNode.binary())).containsExactlyInAnyOrder(
        PosixFilePermission.OWNER_READ,
        PosixFilePermission.OWNER_WRITE,
        PosixFilePermission.OWNER_EXECUTE
      );
    }
  }

  @Test
  void should_extract_runtime_when_deployed_version_is_different() throws Exception {
    var env = hostEnvironment();
    Files.createDirectories(deployDirectory());
    Files.writeString(deployDirectory().resolve(hostBinaryName()), "node-binary-old");
    Files.writeString(deployDirectory().resolve(EmbeddedNode.VERSION_FILENAME), "old");
    var resourceFetcher = resourceFetcherFor(hostArchivePath(), hostVersionPath(), "v2");

    var embeddedNode = new ScannerEmbeddedNode(successfulProcessWrapper(), env, resourceFetcher);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(Files.readString(embeddedNode.binary())).isEqualTo("node-binary-v2");
    assertThat(
      Files.readString(deployDirectory().resolve(EmbeddedNode.VERSION_FILENAME))
    ).isEqualTo("v2");
  }

  @Test
  void should_extract_windows_runtime_without_changing_permissions() throws Exception {
    var env = windowsX64Environment(tempDir);
    var resourceFetcher = resourceFetcherFor("win-x64/node.exe.xz", "win-x64/version.txt", "v1");

    var embeddedNode = new ScannerEmbeddedNode(successfulProcessWrapper(), env, resourceFetcher);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(embeddedNode.binary().getFileName()).hasToString("node.exe");
    assertThat(Files.readString(embeddedNode.binary())).isEqualTo("node-binary-v1");
  }

  /**
   * Extraction really writes files and sets permissions, so the simulated platform has to match the host:
   * POSIX permissions are not supported on Windows file systems.
   */
  private static boolean isWindowsHost() {
    return OS.current() == OS.WINDOWS;
  }

  private Environment hostEnvironment() {
    return isWindowsHost() ? windowsX64Environment(tempDir) : linuxX64Environment(tempDir);
  }

  private static String hostArchivePath() {
    return isWindowsHost() ? "win-x64/node.exe.xz" : "linux-x64/bin/node.xz";
  }

  private static String hostVersionPath() {
    return isWindowsHost() ? "win-x64/version.txt" : "linux-x64/version.txt";
  }

  private static String hostBinaryName() {
    return isWindowsHost() ? "node.exe" : "node";
  }

  private Environment windowsX64Environment(Path sonarUserHome) {
    var env = mock(Environment.class);
    when(env.getOsName()).thenReturn("Windows 11");
    when(env.getOsArch()).thenReturn("amd64");
    when(env.getSonarUserHome()).thenReturn(sonarUserHome);
    return env;
  }

  private Path deployDirectory() {
    return tempDir.resolve("js").resolve("node-runtime");
  }

  private ResourceFetcher resourceFetcherFor(String archivePath, String versionPath, String version)
    throws Exception {
    var compressed = new ByteArrayOutputStream();
    try (var xz = new XZOutputStream(compressed, new LZMA2Options())) {
      xz.write(("node-binary-" + version).getBytes(StandardCharsets.UTF_8));
    }
    var downloads = tempDir.resolve("resource-fetcher-downloads");
    Files.createDirectories(downloads);
    var archive = Files.write(downloads.resolve("archive.xz"), compressed.toByteArray());
    var versionFile = Files.writeString(downloads.resolve("version.txt"), version);
    var resourceFetcher = mock(ResourceFetcher.class);
    when(resourceFetcher.fetch(PLUGIN_KEY, archivePath)).thenReturn(archive);
    when(resourceFetcher.fetch(PLUGIN_KEY, versionPath)).thenReturn(versionFile);
    return resourceFetcher;
  }

  private ProcessWrapper successfulProcessWrapper() throws Exception {
    var processWrapper = mock(ProcessWrapper.class);
    var process = mock(Process.class);
    when(processWrapper.startProcess(any(), any(), any(), any())).thenReturn(process);
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
    when(resourceFetcher.fetch(PLUGIN_KEY, "linux-x64/bin/node.xz")).thenReturn(
      copyTestResource("/linux-x64/node.xz", "node.xz")
    );
    when(resourceFetcher.fetch(PLUGIN_KEY, "linux-x64/version.txt")).thenReturn(
      copyTestResource("/linux-x64/version.txt", "version.txt")
    );

    var embeddedNode = new ScannerEmbeddedNode(successfulProcessWrapper(), env, resourceFetcher);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isTrue();
    assertThat(Files.exists(embeddedNode.binary())).isTrue();
    verify(resourceFetcher).fetch(PLUGIN_KEY, "linux-x64/bin/node.xz");
    verify(resourceFetcher).fetch(PLUGIN_KEY, "linux-x64/version.txt");
  }

  @Test
  void should_fall_back_to_host_node_on_sonarlint() throws Exception {
    var env = linuxX64Environment(tempDir);

    var embeddedNode = new UnavailableEmbeddedNode(successfulProcessWrapper(), env);
    embeddedNode.deploy();

    assertThat(embeddedNode.isAvailable()).isFalse();
  }

  private Path copyTestResource(String classpathResource, String fileName) throws Exception {
    var target = tempDir.resolve("resource-fetcher-downloads").resolve(fileName);
    copyTestResourceTo(classpathResource, target);
    return target;
  }

  private void copyTestResourceTo(String classpathResource, Path target) throws Exception {
    Files.createDirectories(target.getParent());
    try (var is = getClass().getResourceAsStream(classpathResource)) {
      assertThat(is).isNotNull();
      Files.copy(is, target);
    }
  }
}
