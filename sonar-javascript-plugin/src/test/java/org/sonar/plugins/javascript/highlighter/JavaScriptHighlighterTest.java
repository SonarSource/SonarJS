/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
package org.sonar.plugins.javascript.highlighter;

import com.google.common.base.Charsets;
import org.junit.Test;
import org.sonar.api.source.Highlightable;
import org.sonar.javascript.EcmaScriptConfiguration;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class JavaScriptHighlighterTest {

  private final JavaScriptHighlighter highlighter = new JavaScriptHighlighter(new EcmaScriptConfiguration(Charsets.UTF_8));

  private Highlightable.HighlightingBuilder highlight(String string) throws Exception{
    Highlightable highlightable = mock(Highlightable.class);
    Highlightable.HighlightingBuilder builder = mock(Highlightable.HighlightingBuilder.class);
    when(highlightable.newHighlighting()).thenReturn(builder);
    highlighter.highlight(highlightable, string);
    verify(builder).done();
    return builder;
  }

  @Test
  public void empty_input() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("");
    verifyNoMoreInteractions(builder);
  }

  @Test
  public void multiline_comment() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("  /*Comment*/ ");
    verify(builder).highlight(2, 13, "cd");
  }

  @Test
  public void single_line_comment() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("  //Comment ");
    verify(builder).highlight(2, 12, "cd");
  }

  @Test
  public void html_comment() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("  <!--Comment ");
    verify(builder).highlight(2, 14, "cd");
  }


  @Test
  public void javadoc_comment() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("  /**Comment*/ ");
    verify(builder).highlight(2, 14, "cppd");
  }

  @Test
  public void keyword() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("var x = 0");
    verify(builder).highlight(0, 3, "k");
  }

  @Test
  public void string() throws Exception {
    Highlightable.HighlightingBuilder builder = highlight("var x = \"a\"");
    verify(builder).highlight(8, 11, "s");
  }

}
