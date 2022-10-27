package org.sonar.plugins.javascript.eslint.cache;

import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.eslint.PluginInfo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CacheKeyTest {

  private final static InputFile inputFile = mock(InputFile.class);

  static {
    when(inputFile.key()).thenReturn("fileKey");
  }

  @Test
  void test_no_ucfg_version_in_key() {
    PluginInfo.setUcfgPluginVersion(null);
    assertThat(CacheKey.forFile(inputFile)).hasToString("jssecurity:ucfgs:fileKey");
  }

  @Test
  void test_ucfg_version_in_key() {
    PluginInfo.setUcfgPluginVersion("ucfg_version");
    assertThat(CacheKey.forFile(inputFile)).hasToString("jssecurity:ucfgs:ucfg_version:fileKey");
  }
}
