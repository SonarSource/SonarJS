/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.highlighter;

import com.google.common.base.Charsets;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.javascript.visitors.JavaScriptFileImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.api.batch.sensor.highlighting.TypeOfText.COMMENT;
import static org.sonar.api.batch.sensor.highlighting.TypeOfText.KEYWORD;
import static org.sonar.api.batch.sensor.highlighting.TypeOfText.STRING;

public class HighlighterVisitorTest extends JavaScriptTreeModelTest {

  private static final Charset CHARSET = Charsets.UTF_8;

  private HighlighterVisitor highlighterVisitor;

  private TreeVisitorContext visitorContext;
  private SensorContextTester sensorContext;
  private DefaultInputFile inputFile;

  @Rule
  public TemporaryFolder tempFolder = new TemporaryFolder();

  @Before
  public void setUp() throws IOException {

    sensorContext = SensorContextTester.create(tempFolder.getRoot());
    visitorContext = mock(TreeVisitorContext.class);
    highlighterVisitor = new HighlighterVisitor(sensorContext);
  }

  private void initFile(String text) throws IOException {
    File file = tempFolder.newFile();
    inputFile = new TestInputFileBuilder("moduleKey", file.getName())
      .setLanguage("js")
      .setType(Type.MAIN)
      .setCharset(CHARSET)
      .initMetadata(text).build();

    when(visitorContext.getJavaScriptFile()).thenReturn(new JavaScriptFileImpl(inputFile));
  }

  private void highlight(String string) throws Exception {
    initFile(string);
    Tree tree = p.parse(string);
    when(visitorContext.getTopTree()).thenReturn((ScriptTree) tree);
    highlighterVisitor.scanTree(visitorContext);
  }

  private void assertHighlighting(int column, int length, TypeOfText type) {
    assertHighlighting(1, column, length, type);
  }

  private void assertHighlighting(int line, int column, int length, TypeOfText type) {
    for (int i = column; i < column + length; i++) {
      List<TypeOfText> typeOfTexts = sensorContext.highlightingTypeAt("moduleKey:" + inputFile.relativePath(), line, i);
      assertThat(typeOfTexts).hasSize(1);
      assertThat(typeOfTexts.get(0)).isEqualTo(type);
    }
  }

  @Test
  public void empty_input() throws Exception {
    highlight("");
    assertThat(sensorContext.highlightingTypeAt("moduleKey:" + inputFile.relativePath(), 1, 0)).isEmpty();
  }

  @Test
  public void multiline_comment() throws Exception {
    highlight("/*\nComment\n*/ ");
    assertHighlighting(1, 0, 2, COMMENT);
    assertHighlighting(2, 0, 7, COMMENT);
    assertHighlighting(3, 0, 2, COMMENT);
  }

  @Test
  public void single_line_comment() throws Exception {
    highlight("  //Comment ");
    assertHighlighting(2, 10, COMMENT);
  }

  @Test
  public void html_comment() throws Exception {
    highlight("  <!--Comment ");
    assertHighlighting(2, 12, COMMENT);
  }


  @Test
  public void javadoc_comment() throws Exception {
    highlight("  /**Comment*/ ");
    assertHighlighting(2, 12, TypeOfText.STRUCTURED_COMMENT);
  }

  @Test
  public void numbers() throws Exception {
    highlight("x = 1; y = 1.0");
    assertHighlighting(4, 1, TypeOfText.CONSTANT);
    assertHighlighting(11, 1, TypeOfText.CONSTANT);
  }

  @Test
  public void string() throws Exception {
    highlight("var x = \"a\"");
    assertHighlighting(8, 3, STRING);
  }

  @Test
  public void keyword() throws Exception {
    highlight("var x = 0");
    assertHighlighting(0, 3, KEYWORD);
  }

  @Test
  public void let_keyword() throws Exception {
    highlight("let x;");
    assertHighlighting(0, 3, KEYWORD);
  }

  @Test
  public void static_property() throws Exception {
    highlight("class A { \nstatic foo; }");
    assertHighlighting(2, 0, 6, KEYWORD);
  }

  @Test
  public void static_keyword_method() throws Exception {
    highlight("class A { \nstatic foo(){} }");
    assertHighlighting(0, 5, KEYWORD);
    assertHighlighting(2, 0, 6, KEYWORD);
  }

  @Test
  public void static_keyword_generator() throws Exception {
    highlight("class B { \nstatic * foo(){} }");
    assertHighlighting(0, 5, KEYWORD);
    assertHighlighting(2, 0, 6, KEYWORD);
  }

  @Test
  public void static_keyword_getter() throws Exception {
    highlight("class C { \nstatic get prop(){} }");
    assertHighlighting(0, 5, KEYWORD);
    assertHighlighting(2, 0, 6, KEYWORD);
  }

  @Test
  public void const_keyword() throws Exception {
    highlight("const x;");
    assertHighlighting(0, 5, KEYWORD);
  }

  @Test
  public void byte_order_mark() throws Exception {
    highlight("\uFEFFvar x //\nvar y //");
    assertHighlighting(0, 3, KEYWORD);
    assertHighlighting(2, 0, 3, KEYWORD);
  }

  @Test
  public void template_literal() throws Exception {
    highlight("`start ${foo()} middle ${bar()} end`");
    assertHighlighting(0, 7, STRING);
    assertHighlighting(15, 8, STRING);
    assertHighlighting(31, 5, STRING);
  }

}
