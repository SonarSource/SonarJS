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
package org.sonar.plugins.javascript;

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Before;
import org.junit.Test;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.tree.impl.declaration.ScriptTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.utils.IssuableMock;

import java.io.File;
import java.util.Collections;

public class JavaScriptCheckContextTest {

  private static final String ISSUE_MESSAGE = "message";
  private static final int ISSUE_LINE = 3;

  private JavaScriptCheckContext context;
  private Issuable issuable;
  private JavaScriptCheck checkMock = mock(JavaScriptCheck.class);
  private InternalSyntaxToken tree;

  @Before
  public void setUp() throws Exception {
    JavaScriptChecks javaScriptCheck = mock(JavaScriptChecks.class);
    when(javaScriptCheck.ruleKeyFor(any(JavaScriptCheck.class))).thenReturn(mock(RuleKey.class));

    issuable = new IssuableMock();
    tree = new InternalSyntaxToken(2, 3, "token", Collections.EMPTY_LIST, 3, false);
    context = new JavaScriptCheckContext(
      new ScriptTreeImpl(null, null, null),
      issuable,
      new File(""),
      mock(SymbolModel.class),
      new Settings(),
      javaScriptCheck,
      new ComplexityVisitor());

  }

  @Test
  public void addIssue_tree() throws Exception {
    context.addIssue(checkMock, tree, ISSUE_MESSAGE);

    assertThat(issuable.issues()).hasSize(1);
    assertIssueProperties(issuable.issues().get(0), tree.line(), null);
  }

  @Test
  public void addIssue_line() throws Exception {
    context.addIssue(checkMock, ISSUE_LINE, ISSUE_MESSAGE);

    assertThat(issuable.issues()).hasSize(1);
    assertIssueProperties(issuable.issues().get(0), ISSUE_LINE, null);
  }

  @Test
  public void addFileIssue() throws Exception {
    context.addFileIssue(checkMock, ISSUE_MESSAGE);

    assertThat(issuable.issues()).hasSize(1);
    assertIssueProperties(issuable.issues().get(0), null, null);
  }

  @Test
  public void addFileIssue_tree_with_cost() throws Exception {
    context.addIssue(checkMock, tree, ISSUE_MESSAGE, 10);

    assertThat(issuable.issues()).hasSize(1);
    assertIssueProperties(issuable.issues().get(0), tree.line(), 10D);
  }

  @Test
  public void addFileIssue_line_with_cost() throws Exception {
    context.addIssue(checkMock, ISSUE_LINE, ISSUE_MESSAGE, 10);

    assertThat(issuable.issues()).hasSize(1);
    assertIssueProperties(issuable.issues().get(0), ISSUE_LINE, 10D);
  }

  private static void assertIssueProperties(Issue issue, Integer line, Double effortToFix) {
    // Line
    if (line != null) {
      assertThat(issue.line()).isEqualTo(line).overridingErrorMessage("Issue is expected to be set for line 2 but it is for " + issue.line());
    } else {
      assertThat(issue.line()).isNull();
    }

    // Message
    assertThat(issue.message()).isEqualTo(ISSUE_MESSAGE).overridingErrorMessage("Issue is expected have message \"" + ISSUE_MESSAGE + "\" but it is for \"" + issue.message() + "\"");

    // effort to fix
    if (effortToFix != null) {
      assertThat(issue.effortToFix()).isEqualTo(effortToFix).overridingErrorMessage("Issue is expected to be set for line 2 but it is for " + issue.line());
    } else {
      assertThat(issue.effortToFix()).isNull();
    }
  }

}
