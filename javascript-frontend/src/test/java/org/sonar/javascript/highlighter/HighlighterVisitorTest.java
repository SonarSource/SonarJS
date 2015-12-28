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
package org.sonar.javascript.highlighter;

import com.google.common.base.Charsets;
import com.google.common.io.Files;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.source.Highlightable;
import org.sonar.api.source.Highlightable.HighlightingBuilder;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class HighlighterVisitorTest extends JavaScriptTreeModelTest {

  private static final Charset CHARSET = Charsets.UTF_8;

  private HighlighterVisitor highlighterVisitor;

  private HighlightingBuilder highlightingBuilder;
  private TreeVisitorContext visitorContext;
  private DefaultFileSystem fileSystem;
  private File file;

  @Rule
  public TemporaryFolder tempFolder = new TemporaryFolder();

  @Before
  public void setUp() throws IOException {
    fileSystem = new DefaultFileSystem();
    fileSystem.setEncoding(CHARSET);
    file = tempFolder.newFile();
    DefaultInputFile inputFile = new DefaultInputFile("relative-path")
      .setAbsolutePath(file.getAbsolutePath())
      .setLanguage("js")
      .setType(Type.MAIN);
    fileSystem.add(inputFile);

    ResourcePerspectives resourcePerspectives = mock(ResourcePerspectives.class);
    Highlightable highlightable = mock(Highlightable.class);
    highlightingBuilder = mock(HighlightingBuilder.class);
    visitorContext = mock(TreeVisitorContext.class);

    highlighterVisitor = new HighlighterVisitor(resourcePerspectives, fileSystem);

    when(resourcePerspectives.as(eq(Highlightable.class), any(InputFile.class))).thenReturn(highlightable);
    when(highlightable.newHighlighting()).thenReturn(highlightingBuilder);
    when(visitorContext.getFile()).thenReturn(file);
  }

  private void highlight(String string) throws Exception {
    Files.write(string, file, CHARSET);
    Tree tree = p.parse(string);
    when(visitorContext.getTopTree()).thenReturn((ScriptTree) tree);
    highlighterVisitor.scanTree(visitorContext);
    verify(highlightingBuilder).done();
  }

  @Test
  public void no_highlightable() throws Exception {
    ResourcePerspectives resourcePerspectives = mock(ResourcePerspectives.class);
    HighlighterVisitor failingHighlighterVisitor = new HighlighterVisitor(resourcePerspectives, fileSystem);
    when(resourcePerspectives.as(eq(Highlightable.class), any(InputFile.class))).thenReturn(null);

    Tree tree = p.parse("var a = 1");
    when(visitorContext.getTopTree()).thenReturn((ScriptTree) tree);
    failingHighlighterVisitor.scanTree(visitorContext);
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void empty_input() throws Exception {
    highlight("");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void multiline_comment() throws Exception {
    highlight("  /*Comment*/ ");
    verify(highlightingBuilder).highlight(2, 13, "cd");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void single_line_comment() throws Exception {
    highlight("  //Comment ");
    verify(highlightingBuilder).highlight(2, 12, "cd");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void html_comment() throws Exception {
    highlight("  <!--Comment ");
    verify(highlightingBuilder).highlight(2, 14, "cd");
    verifyNoMoreInteractions(highlightingBuilder);
  }


  @Test
  public void javadoc_comment() throws Exception {
    highlight("  /**Comment*/ ");
    verify(highlightingBuilder).highlight(2, 14, "j");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void numbers() throws Exception {
    highlight("x = 1; y = 1.0");
    verify(highlightingBuilder).highlight(4, 5, "c");
    verify(highlightingBuilder).highlight(11, 14, "c");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void string() throws Exception {
    highlight("var x = \"a\"");
    verify(highlightingBuilder).highlight(0, 3, "k");
    verify(highlightingBuilder).highlight(8, 11, "s");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void keyword() throws Exception {
    highlight("var x = 0");
    verify(highlightingBuilder).highlight(0, 3, "k");
    verify(highlightingBuilder).highlight(8, 9, "c");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void let_keyword() throws Exception {
    highlight("let x;");
    verify(highlightingBuilder).highlight(0, 3, "k");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void static_keyword_method() throws Exception {
    highlight("class A { static foo(){} }");
    verify(highlightingBuilder).highlight(0, 5, "k");
    verify(highlightingBuilder).highlight(10, 16, "k");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void static_keyword_generator() throws Exception {
    highlight("class B { static * foo(){} }");
    verify(highlightingBuilder).highlight(0, 5, "k");
    verify(highlightingBuilder).highlight(10, 16, "k");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void static_keyword_getter() throws Exception {
    highlight("class C { static get prop(){} }");
    verify(highlightingBuilder).highlight(0, 5, "k");
    verify(highlightingBuilder).highlight(10, 16, "k");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void const_keyword() throws Exception {
    highlight("const x;");
    verify(highlightingBuilder).highlight(0, 5, "k");
    verifyNoMoreInteractions(highlightingBuilder);
  }

  @Test
  public void byte_order_mark() throws Exception {
    highlight("\uFEFFvar x //\nvar y //");
    verify(highlightingBuilder).highlight(0, 3, "k");
    verify(highlightingBuilder).highlight(9, 12, "k");
    verify(highlightingBuilder).highlight(6, 8, "cd");
    verify(highlightingBuilder).highlight(15, 17, "cd");
    verifyNoMoreInteractions(highlightingBuilder);
  }

}
