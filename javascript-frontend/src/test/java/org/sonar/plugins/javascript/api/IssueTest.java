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
package org.sonar.plugins.javascript.api;

import java.util.Collections;
import org.junit.Test;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

import static org.assertj.core.api.Assertions.assertThat;

public class IssueTest {

  private static final JavaScriptCheck check = new DoubleDispatchVisitorCheck() { };
  private static final String MESSAGE = "message";
  private static final InternalSyntaxToken token = new InternalSyntaxToken(5, 1, "value", Collections.<SyntaxTrivia>emptyList(), 42, false);


  @Test
  public void test_file_issue() throws Exception {
    FileIssue fileIssue = new FileIssue(check, MESSAGE);

    assertThat(fileIssue.check()).isEqualTo(check);
    assertThat(fileIssue.cost()).isNull();
    assertThat(fileIssue.message()).isEqualTo(MESSAGE);

    fileIssue.cost(42);
    assertThat(fileIssue.cost()).isEqualTo(42);
  }

  @Test
  public void test_line_issue() throws Exception {
    LineIssue lineIssue = new LineIssue(check, 42, MESSAGE);

    assertThat(lineIssue.check()).isEqualTo(check);
    assertThat(lineIssue.cost()).isNull();
    assertThat(lineIssue.message()).isEqualTo(MESSAGE);
    assertThat(lineIssue.line()).isEqualTo(42);

    lineIssue.cost(42);
    assertThat(lineIssue.cost()).isEqualTo(42);

    lineIssue = new LineIssue(check, token, MESSAGE);
    assertThat(lineIssue.line()).isEqualTo(5);
  }

  @Test
  public void test_precise_issue() throws Exception {
    IssueLocation primaryLocation = new IssueLocation(token, MESSAGE);
    PreciseIssue preciseIssue = new PreciseIssue(check, primaryLocation);

    assertThat(preciseIssue.check()).isEqualTo(check);
    assertThat(preciseIssue.cost()).isNull();
    assertThat(preciseIssue.primaryLocation()).isEqualTo(primaryLocation);
    assertThat(preciseIssue.secondaryLocations()).isEmpty();

    preciseIssue.cost(42);
    assertThat(preciseIssue.cost()).isEqualTo(42);

    assertThat(primaryLocation.startLine()).isEqualTo(5);
    assertThat(primaryLocation.endLine()).isEqualTo(5);
    assertThat(primaryLocation.startLineOffset()).isEqualTo(1);
    assertThat(primaryLocation.endLineOffset()).isEqualTo(6);
    assertThat(primaryLocation.message()).isEqualTo(MESSAGE);

    preciseIssue
      .secondary(token)
      .secondary(token, "secondary message");

    assertThat(preciseIssue.secondaryLocations()).hasSize(2);
    assertThat(preciseIssue.secondaryLocations().get(0).message()).isNull();
    assertThat(preciseIssue.secondaryLocations().get(1).message()).isEqualTo("secondary message");
  }

  @Test
  public void test_long_issue_location() throws Exception {
    InternalSyntaxToken lastToken = new InternalSyntaxToken(10, 5, "last", Collections.<SyntaxTrivia>emptyList(), 42, false);

    IssueLocation issueLocation = new IssueLocation(token, lastToken, MESSAGE);

    assertThat(issueLocation.startLine()).isEqualTo(5);
    assertThat(issueLocation.endLine()).isEqualTo(10);
    assertThat(issueLocation.startLineOffset()).isEqualTo(1);
    assertThat(issueLocation.endLineOffset()).isEqualTo(9);
    assertThat(issueLocation.message()).isEqualTo(MESSAGE);

  }
}
