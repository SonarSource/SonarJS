/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonarsource.nodejs;

import org.junit.Test;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.utils.log.LogTester;
import org.sonar.api.utils.log.LoggerLevel;

import static org.assertj.core.api.Assertions.assertThat;

public class MockCommandBuilderTest {

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @Test
  public void test() {
    StringBuilder output = new StringBuilder();
    StringBuilder error = new StringBuilder();
    NodeCommand nodeCommand = new MockCommandBuilder("v10.1.1", "error", 1)
      .outputConsumer(output::append)
      .errorConsumer(error::append)
      .minNodeVersion(99) // no-op in case of MockCommand
      .nodeJsArgs("-v")
      .script("script.js")
      .scriptArgs("scriptArgs")
      .configuration(new MapSettings().asConfig())
      .maxOldSpaceSize(2048)
      .build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(output.toString()).isEqualTo("v10.1.1");
    assertThat(error.toString()).isEqualTo("error");
    assertThat(exitValue).isEqualTo(1);
  }

  @Test
  public void test_default() {
    NodeCommand nodeCommand = new MockCommandBuilder("v10.1.1", "error", 1).build();
    nodeCommand.start();
    int exitValue = nodeCommand.waitFor();
    assertThat(exitValue).isEqualTo(1);
    assertThat(logTester.logs(LoggerLevel.INFO)).contains("v10.1.1");
    assertThat(logTester.logs(LoggerLevel.ERROR)).contains("error");
  }
}
