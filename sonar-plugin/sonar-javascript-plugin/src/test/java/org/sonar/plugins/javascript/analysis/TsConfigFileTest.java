package org.sonar.plugins.javascript.analysis;

import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

class TsConfigFileTest {
  @Test
  void getters() {
    var file = new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList());
    assertThat(file.getFilename()).isEqualTo("dir1/tsconfig.json");
    assertThat(file.getProjectReferences()).isEmpty();
    assertThat(file).hasToString("dir1/tsconfig.json");
  }
}
