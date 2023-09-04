package org.sonar.plugins.javascript.eslint;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmbeddedNodeTest {

  @Test
  void should_detect_platform_macos() {
    if (System.getProperty("os.name").startsWith("Mac")) {
      assertThat(EmbeddedNode.Platform.detect()).isEqualTo(EmbeddedNode.Platform.MACOS_ARM64);
    }
  }

  @Test
  void should_decompress_the_runtime() {}
}
