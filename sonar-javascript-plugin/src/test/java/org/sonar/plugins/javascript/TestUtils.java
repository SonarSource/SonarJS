/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.internal.ActiveRulesBuilder;
import org.sonar.api.batch.rule.internal.NewActiveRule;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.utils.Version;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class TestUtils {

  public static final String CPD_TOKENS = "{ cpdTokens: [{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"image\":\"LITERAL\"},{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"image\":\"if\"}] }";

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

  public static SensorContextTester createContextWithCache(Path baseDir, Path workDir, String filePath) {
    var context = SensorContextTester.create(baseDir);
    context.fileSystem().setWorkDir(workDir);
    context.setRuntime(SonarRuntimeImpl.forSonarQube(Version.create(9, 6), SonarQubeSide.SCANNER, SonarEdition.ENTERPRISE));
    context.setNextCache(mock(WriteCache.class));
    context.setPreviousCache(mock(ReadCache.class));
    context.setCanSkipUnchangedFiles(true);

    var cache = context.previousCache();
    when(cache.contains("jssecurity:ucfgs:JSON:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("jssecurity:ucfgs:JSON:moduleKey:" + filePath)).thenReturn(new ByteArrayInputStream("{\"fileSizes\":[]}".getBytes(StandardCharsets.UTF_8)));
    when(cache.contains("jssecurity:ucfgs:SEQ:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("jssecurity:ucfgs:SEQ:moduleKey:" + filePath)).thenReturn(new ByteArrayInputStream(new byte[0]));
    when(cache.contains("js:cpd:data:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("js:cpd:data:moduleKey:" + filePath)).thenReturn(new ByteArrayInputStream(CPD_TOKENS.getBytes(StandardCharsets.UTF_8)));
    return context;
  }

}
