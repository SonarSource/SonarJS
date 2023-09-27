package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.DARWIN_ARM64;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.DARWIN_X64;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.LINUX_X64;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.UNSUPPORTED;
import static org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform.WIN_X64;

import java.nio.file.Files;
import java.nio.file.Path;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.bridge.EmbeddedNode.Platform;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

class EmbeddedNodeTest {

  @TempDir
  Path tempDir;

  private Environment currentEnvironment = new Environment(new MapSettings().asConfig());

  @RegisterExtension
  private LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void should_extract_if_deployLocation_contains_a_different_version() throws Exception {
    var en = testEmbeddedNode();
    var runtimeFolder = en.binary().getParent();
    Files.createDirectories(runtimeFolder);
    Files.write(runtimeFolder.resolve("version.txt"), "a-different-version".getBytes());
    en.deploy();
    assertThat(en.binary()).exists();
    assertThat(en.isAvailable()).isTrue();
  }

  @Test
  void should_not_extract_if_deployLocation_contains_the_same_version() throws Exception {
    logTester.setLevel(Level.DEBUG);
    var en = testEmbeddedNode();
    en.deploy();
    assertThat(logTester.logs()).anyMatch(l -> l.startsWith("Extracting embedded node"));
    logTester.clear();
    en = testEmbeddedNode();
    assertThat(en.isAvailable()).isFalse();
    en.deploy();
    assertThat(logTester.logs()).anyMatch(l -> l.startsWith("Skipping node deploy."));
    assertThat(en.isAvailable()).isTrue();
  }

  @Test
  void should_not_extract_neither_be_available_if_the_platform_is_unsupported() throws Exception {
    var en = new EmbeddedNode(mock(ProcessWrapper.class), createUnsupportedEnvironment());
    en.deploy();
    assertThat(en.binary()).doesNotExist();
    assertThat(en.isAvailable()).isFalse();
  }

  @Test
  void should_extract_if_deployLocation_has_no_version() throws Exception {
    var en = testEmbeddedNode();
    en.deploy();
    assertThat(tempDir.resolve(en.binary())).exists();
  }

  @Test
  void should_detect_platform_for_windows_environment() {
    var platform = Platform.detect(createWindowsEnvironment());
    assertThat(platform).isEqualTo(WIN_X64);
    assertThat(platform.archivePathInJar()).isEqualTo("/win-x64/node.exe.xz");
  }

  @Test
  void should_detect_platform_for_mac_os_arm64_environment() {
    var platform = Platform.detect(createMacOSArm64Environment());
    assertThat(platform).isEqualTo(DARWIN_ARM64);
    assertThat(platform.archivePathInJar()).isEqualTo("/darwin-arm64/node.xz");
  }

  @Test
  void should_detect_platform_for_mac_os_x64_environment() {
    var platform = Platform.detect(createMacOSX64Environment());
    assertThat(platform).isEqualTo(DARWIN_X64);
    assertThat(platform.archivePathInJar()).isEqualTo("/darwin-x64/node.xz");
  }

  @Test
  void should_detect_platform_for_linux_environment() {
    var linux = mock(Environment.class);
    when(linux.getOsName()).thenReturn("linux");
    when(linux.getOsArch()).thenReturn("amd64");
    var platform = Platform.detect(linux);
    assertThat(platform).isEqualTo(LINUX_X64);
    assertThat(platform.archivePathInJar()).isEqualTo("/linux-x64/node.xz");
  }

  @Test
  void should_return_unsupported_for_unknown_environment() {
    var platform = Platform.detect(createUnsupportedEnvironment());
    assertThat(platform).isEqualTo(UNSUPPORTED);
    assertThat(platform.archivePathInJar()).isEqualTo("node.xz");
  }

  @Test
  void test_unsupported_archs() {
    var win = mock(Environment.class);
    when(win.getOsName()).thenReturn("Windows");
    when(win.getOsArch()).thenReturn("unknown");
    assertThat(Platform.detect(win)).isEqualTo(UNSUPPORTED);

    var linux = mock(Environment.class);
    when(linux.getOsName()).thenReturn("linux");
    when(linux.getOsArch()).thenReturn("unknown");
    assertThat(Platform.detect(linux)).isEqualTo(UNSUPPORTED);

    var macos = mock(Environment.class);
    when(macos.getOsName()).thenReturn("mac os");
    when(macos.getOsArch()).thenReturn("unknown");
    assertThat(Platform.detect(macos)).isEqualTo(UNSUPPORTED);
  }

  @Test
  void should_fail_gracefully() throws Exception {
    ProcessWrapper processWrapper = mock(ProcessWrapper.class);
    when(processWrapper.waitFor(any(), anyLong(), any()))
      .thenThrow(new IllegalStateException("My Error"));
    var en = new EmbeddedNode(processWrapper, createTestEnvironment());
    en.deploy();
    assertThat(logTester.logs())
      .anyMatch(l ->
        l.startsWith("Embedded Node.js failed to deploy. Will fallback to host Node.js")
      );
  }

  @NotNull
  private EmbeddedNode testEmbeddedNode() {
    return new EmbeddedNode(new ProcessWrapperImpl(), createTestEnvironment());
  }

  private Environment createTestEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getSonarUserHome()).thenReturn(tempDir);
    when(mockEnvironment.getOsName()).thenReturn(currentEnvironment.getOsName());
    when(mockEnvironment.getOsArch()).thenReturn(currentEnvironment.getOsArch());
    return mockEnvironment;
  }

  private Environment createMacOSArm64Environment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getOsName()).thenReturn("mac os x");
    when(mockEnvironment.getOsArch()).thenReturn("aarch64");
    return mockEnvironment;
  }

  private Environment createMacOSX64Environment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getOsName()).thenReturn("mac os x");
    when(mockEnvironment.getOsArch()).thenReturn("amd64");
    return mockEnvironment;
  }

  private Environment createWindowsEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getOsName()).thenReturn("Windows 99");
    when(mockEnvironment.getOsArch()).thenReturn("amd64");
    return mockEnvironment;
  }

  private Environment createUnsupportedEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getSonarUserHome()).thenReturn(tempDir);
    when(mockEnvironment.getOsName()).thenReturn("");
    when(mockEnvironment.getOsArch()).thenReturn("");
    return mockEnvironment;
  }
}
