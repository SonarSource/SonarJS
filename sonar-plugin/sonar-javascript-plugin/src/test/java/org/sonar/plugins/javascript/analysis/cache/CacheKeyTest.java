/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.PluginInfo;

class CacheKeyTest {

  private static final InputFile inputFile = mock(InputFile.class);

  @BeforeEach
  void setUp() {
    when(inputFile.key()).thenReturn("fileKey");
  }

  @Test
  void test_no_ucfg_version_in_key() {
    PluginInfo.setUcfgPluginVersion(null);
    assertThat(CacheKey.forFile(inputFile, null).forUcfg()).hasToString("jssecurity:ucfgs:fileKey");
  }

  @Test
  void test_cpd_data_key() {
    assertThat(CacheKey.forFile(inputFile, null).forCpd()).hasToString("js:cpd:fileKey");
  }

  @Test
  void test_ucfg_version_in_key() {
    PluginInfo.setUcfgPluginVersion("ucfg_version");
    assertThat(CacheKey.forFile(inputFile, null).forUcfg())
      .hasToString("jssecurity:ucfgs:ucfg_version:fileKey");
  }
}
