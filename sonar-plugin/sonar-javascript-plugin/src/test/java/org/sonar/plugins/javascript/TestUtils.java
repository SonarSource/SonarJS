/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript;

import java.nio.charset.StandardCharsets;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.rule.RulesDefinition;

public class TestUtils {

  public static DefaultInputFile createInputFile(SensorContextTester sensorContext, String content, String relativePath) {
    DefaultInputFile testInputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(sensorContext.fileSystem().baseDirPath())
      .setType(Type.MAIN)
      .setLanguage(relativePath.split("\\.")[1])
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();

    sensorContext.fileSystem().add(testInputFile);
    return testInputFile;
  }

  public static DefaultInputFile createInputFile(SensorContextTester sensorContext, String content, String relativePath, String language) {
    DefaultInputFile testInputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setModuleBaseDir(sensorContext.fileSystem().baseDirPath())
      .setType(Type.MAIN)
      .setLanguage(language)
      .setCharset(StandardCharsets.UTF_8)
      .setContents(content)
      .build();

    sensorContext.fileSystem().add(testInputFile);
    return testInputFile;
  }

  public static RulesDefinition.Repository buildRepository(String repositoryKey, RulesDefinition rulesDefinition) {
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);
    return context.repository(repositoryKey);
  }

  public static CheckFactory checkFactory(String repositoryKey, String... ruleKeys) {
    ActiveRulesBuilder builder = new ActiveRulesBuilder();
    for (String ruleKey : ruleKeys) {
      builder.addRule(new NewActiveRule.Builder().setRuleKey(RuleKey.of(repositoryKey, ruleKey)).build());
    }
    return new CheckFactory(builder.build());
  }

}
