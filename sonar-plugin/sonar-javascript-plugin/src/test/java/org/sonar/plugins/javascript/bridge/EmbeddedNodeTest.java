package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.event.Level;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;

class EmbeddedNodeTest {

  @TempDir
  Path tempDir;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(Level.DEBUG);

  @Test
  void should_extract_if_deployLocation_contains_a_different_version() throws Exception {
    Files.write(tempDir.resolve("version.txt"), "a-different-version".getBytes());
    var en = new EmbeddedNode(createMacOSEnvironment());
    en.deploy();
    assertThat(en.binary()).exists();
  }

  @Test
  void should_not_extract_if_deployLocation_contains_the_same_version() throws Exception {
    var en = new EmbeddedNode(createMacOSEnvironment());
    var runtimeFolder = en.binary().getParent();
    Files.createDirectories(runtimeFolder);
    Files.write(
      runtimeFolder.resolve("version.txt"),
      extractCurrentVersion(createMacOSEnvironment())
    );
    en.deploy();
    assertThat(en.binary()).doesNotExist();
  }

  @Test
  void should_extract_if_deployLocation_has_no_version() throws Exception {
    var en = new EmbeddedNode(createMacOSEnvironment());
    en.deploy();
    assertThat(tempDir.resolve(en.binary())).exists();
  }

  @Test
  void should_detect_platform_for_windows_environment() {
    var platform = EmbeddedNode.Platform.detect(createWindowsEnvironment());
    assertThat(platform).isEqualTo(EmbeddedNode.Platform.WIN_X64);
    assertThat(platform.archivePathInJar()).isEqualTo("/win-x64/node.exe.xz");
  }

  @Test
  void should_detect_platform_for_mac_os_environment() {
    var platform = EmbeddedNode.Platform.detect(createMacOSEnvironment());
    assertThat(platform).isEqualTo(EmbeddedNode.Platform.DARWIN_ARM64);
    assertThat(platform.archivePathInJar()).isEqualTo("/darwin-arm64/node.xz");
  }

  @Test
  void should_return_unsupported_for_unknown_environment() {
    var platform = EmbeddedNode.Platform.detect(createUnsupportedEnvironment());
    assertThat(platform).isEqualTo(EmbeddedNode.Platform.UNSUPPORTED);
    assertThat(platform.archivePathInJar()).isEqualTo("node.xz");
  }

  private byte[] extractCurrentVersion(Environment env) throws IOException {
    return getClass()
      .getResourceAsStream(EmbeddedNode.Platform.detect(env).versionPathInJar())
      .readAllBytes();
  }

  private Environment createMacOSEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getUserHome()).thenReturn(tempDir.toString());
    when(mockEnvironment.getOsName()).thenReturn("mac os x");
    when(mockEnvironment.getOsArch()).thenReturn("aarch64");
    return mockEnvironment;
  }

  private Environment createWindowsEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getUserHome()).thenReturn(tempDir.toString());
    when(mockEnvironment.getOsName()).thenReturn("Windows 99");
    when(mockEnvironment.getOsArch()).thenReturn("amd64");
    return mockEnvironment;
  }

  private Environment createUnsupportedEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getUserHome()).thenReturn("");
    when(mockEnvironment.getOsName()).thenReturn("");
    when(mockEnvironment.getOsArch()).thenReturn("");
    return mockEnvironment;
  }
}
