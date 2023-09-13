package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmbeddedNodeTest {

  @Test
  void should_detect_platform_macos() {
    if (System.getProperty("os.name").startsWith("Mac")) {
      assertThat(EmbeddedNode.Platform.detect()).isEqualTo(EmbeddedNode.Platform.DARWIN_ARM64);
    }
  }
}
