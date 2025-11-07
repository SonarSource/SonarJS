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
package org.sonar.plugins.javascript.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.sonarlint.FSListenerImpl;
import org.sonarsource.sonarlint.core.analysis.container.module.DefaultModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;

class FSListenerTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  private FSListenerImpl fsListener;

  @TempDir
  Path baseDir;

  @BeforeEach
  void setUp() {
    fsListener = new FSListenerImpl();
  }

  @ParameterizedTest
  @EnumSource(ModuleFileEvent.Type.class)
  void testResolvesTsConfigsOnProjectFileChanges(ModuleFileEvent.Type operationType) {
    var file = prepareFile("file.ts");
    var fileEvent = DefaultModuleFileEvent.of(file, operationType);
    fsListener.process(fileEvent);

    assertThat(fsListener.listFSEvents()).containsExactly(
      Map.entry(file.absolutePath(), fileEvent.getType().toString())
    );
    assertThat(fsListener.listFSEvents()).isEmpty();
  }

  private InputFile prepareFile(String filename) {
    return TestInputFileBuilder.create(baseDir.toString(), filename)
      .setLanguage(TypeScriptLanguage.KEY)
      .build();
  }
}
