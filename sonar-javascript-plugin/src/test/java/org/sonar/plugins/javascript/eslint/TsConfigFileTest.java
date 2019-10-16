/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class TsConfigFileTest {

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Test
  public void failsToLoad() {
    EslintBridgeServer server = mock(EslintBridgeServer.class);
    when(server.tsConfigFiles("tsconfig/path")).thenThrow(new IllegalStateException());

    Map<String, List<InputFile>> result = TsConfigFile.inputFilesByTsConfig(Collections.singletonList("tsconfig/path"), Collections.emptyList(), server);
    assertThat(result).isEmpty();

    assertThat(logTester.logs(LoggerLevel.WARN)).contains("Failed to load tsconfig file from tsconfig/path, it will be ignored.");
  }
}
