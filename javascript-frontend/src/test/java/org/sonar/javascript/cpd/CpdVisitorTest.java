/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.cpd;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.FileMetadata;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.internal.google.common.io.Files;
import org.sonar.duplications.internal.pmd.TokensLine;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.fest.assertions.Assertions.assertThat;

public class CpdVisitorTest {

  private static final Charset CHARSET = Charsets.UTF_8;

  private final ActionParser<Tree> p = JavaScriptParserBuilder.createParser(CHARSET);

  private DefaultInputFile inputFile;
  private SensorContextTester sensorContext;

  @Rule
  public TemporaryFolder tempFolder = new TemporaryFolder();

  @Test
  public void test() throws Exception {
    scan("var x = 'a' + 1 + 'line1';\nvar y = 2;\n");
    List<TokensLine> cpdTokenLines = sensorContext.cpdTokens("moduleKey:" + inputFile.file().getName());
    assertThat(cpdTokenLines).hasSize(2);
    TokensLine firstTokensLine = cpdTokenLines.get(0);
    assertThat(firstTokensLine.getValue()).isEqualTo("varx=LITERAL+1+LITERAL;");
    assertThat(firstTokensLine.getStartLine()).isEqualTo(1);
    assertThat(firstTokensLine.getStartUnit()).isEqualTo(1);
    assertThat(firstTokensLine.getEndLine()).isEqualTo(1);
    assertThat(firstTokensLine.getEndUnit()).isEqualTo(9);

    TokensLine secondTokensLine = cpdTokenLines.get(1);
    assertThat(secondTokensLine.getValue()).isEqualTo("vary=2;");
    assertThat(secondTokensLine.getStartLine()).isEqualTo(2);
    assertThat(secondTokensLine.getStartUnit()).isEqualTo(10);
    assertThat(secondTokensLine.getEndLine()).isEqualTo(2);
    assertThat(secondTokensLine.getEndUnit()).isEqualTo(14);
  }

  private void scan(String source) throws IOException {
    File file = tempFolder.newFile();
    Files.write(source, file, CHARSET);

    DefaultFileSystem fileSystem = new DefaultFileSystem(file.getParentFile());
    fileSystem.setEncoding(CHARSET);
    inputFile = new DefaultInputFile("moduleKey", file.getName())
      .setLanguage("js")
      .setType(Type.MAIN)
      .initMetadata(new FileMetadata().readMetadata(file, CHARSET));
    fileSystem.add(inputFile);

    sensorContext = SensorContextTester.create(tempFolder.getRoot().toPath());
    CpdVisitor cpdVisitor = new CpdVisitor(fileSystem, sensorContext);
    ScriptTree tree = (ScriptTree)p.parse(file);
    TreeVisitorContext visitorContext = new JavaScriptVisitorContext(tree, file, null);
    cpdVisitor.scanTree(visitorContext);
  }

}
