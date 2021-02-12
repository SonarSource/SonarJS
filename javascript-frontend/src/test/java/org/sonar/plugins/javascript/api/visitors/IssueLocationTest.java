/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.api.visitors;

import com.google.common.collect.ImmutableList;
import org.junit.Test;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import static org.assertj.core.api.Assertions.assertThat;

public class IssueLocationTest {

  @Test
  public void several_lines_token() throws Exception {
    String tokenValue = "\"first line\\\n" +
      "second\"";

    IssueLocation location = new IssueLocation(createToken(3, 2, tokenValue));
    assertThat(location.endLine()).isEqualTo(4);
    assertThat(location.endLineOffset()).isEqualTo(7);
  }

  @Test
  public void several_lines_comment() throws Exception {
    String tokenValue = "/*first line\n" +
      "second*/";

    IssueLocation location = new IssueLocation(createToken(3, 2, tokenValue));
    assertThat(location.endLine()).isEqualTo(4);
    assertThat(location.endLineOffset()).isEqualTo(8);
  }

  private Tree createToken(int line, int column, String tokenValue) {
    return new InternalSyntaxToken(line, column, tokenValue, ImmutableList.<SyntaxTrivia>of(), 0, false);
  }

}
