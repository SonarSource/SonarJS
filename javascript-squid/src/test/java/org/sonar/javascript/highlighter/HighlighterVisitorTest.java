/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.highlighter;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.source.Highlightable;
import org.sonar.api.source.Highlightable.HighlightingBuilder;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.AstTreeVisitorContext;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import java.io.File;

import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class HighlighterVisitorTest extends JavaScriptTreeModelTest {

  HighlighterVisitor highlighterVisitor;

  private HighlightingBuilder highlightingBuilder;
  private AstTreeVisitorContext visitorContext;
  private DefaultFileSystem fileSystem;

  @Before
  public void setUp() {
    fileSystem = new DefaultFileSystem();
    File file = new File("src/test/resources/highlighter/symbolHighlighting.js");
    DefaultInputFile inputFile = new DefaultInputFile("src/test/resources/highlighter/symbolHighlighting.js")
        .setAbsolutePath(file.getAbsolutePath())
        .setLanguage("js")
        .setType(Type.MAIN);
    fileSystem.add(inputFile);

    ResourcePerspectives resourcePerspectives = mock(ResourcePerspectives.class);
    Highlightable highlightable = mock(Highlightable.class);
    highlightingBuilder = mock(HighlightingBuilder.class);
    visitorContext = mock(AstTreeVisitorContext.class);

    highlighterVisitor = new HighlighterVisitor(resourcePerspectives, fileSystem);

    when(resourcePerspectives.as(eq(Highlightable.class), any(InputFile.class))).thenReturn(highlightable);
    when(highlightable.newHighlighting()).thenReturn(highlightingBuilder);
    when(visitorContext.getFile()).thenReturn(file);
  }

  private void highlight(String string) throws Exception{
    Tree tree = p.parse(string);
    when(visitorContext.getTopTree()).thenReturn((ScriptTree) tree);
    highlighterVisitor.scanFile(visitorContext);
    verify(highlightingBuilder).done();
  }

  @Test
  public void no_highlightable() throws Exception {
    ResourcePerspectives resourcePerspectives = mock(ResourcePerspectives.class);
    HighlighterVisitor failingHighlighterVisitor = new HighlighterVisitor(resourcePerspectives, fileSystem);
    when(resourcePerspectives.as(eq(Highlightable.class), any(InputFile.class))).thenReturn(null);

    Tree tree = p.parse("var a = 1");
    when(visitorContext.getTopTree()).thenReturn((ScriptTree) tree);
    failingHighlighterVisitor.scanFile(visitorContext);
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
  public void keyword() throws Exception {
    highlight("var x = 0");
    verify(highlightingBuilder).highlight(0, 3, "k");
    verify(highlightingBuilder).highlight(8, 9, "c");
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
  public void numbers() throws Exception {
    highlight("x = 1; y = 1.0");
    verify(highlightingBuilder).highlight(4, 5, "c");
    verify(highlightingBuilder).highlight(11, 14, "c");
    verifyNoMoreInteractions(highlightingBuilder);
  }

}
