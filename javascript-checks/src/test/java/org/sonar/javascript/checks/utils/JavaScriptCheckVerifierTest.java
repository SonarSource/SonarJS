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
package org.sonar.javascript.checks.utils;

import com.google.common.collect.ImmutableList;
import com.google.common.io.Files;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Nullable;
import org.apache.commons.lang.StringUtils;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptCheckVerifierTest {

  @Rule
  public TemporaryFolder folder = new TemporaryFolder();

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  @Test
  public void parsing_error() throws Exception {
    thrown.expectMessage("Unable to parse");
    check("foo(");
  }

  @Test
  public void no_issue() throws Exception {
    check("foo; // OK");
  }

  @Test
  public void same_issues() throws Exception {
    check(
      "foo(); // Noncompliant \n" +
        "bar(); // OK",
      Issue.create("msg1", 1));
  }

  @Test
  public void unexpected_issue() throws Exception {
    expect("Unexpected issue at line 2");
    check(
      "foo(); // Noncompliant \n" +
        "bar(); // OK",
      Issue.create("msg1", 1), Issue.create("msg1", 2));
  }

  @Test
  public void missing_issue() throws Exception {
    expect("Missing issue at line 2");
    check(
      "foo(); // Noncompliant \n" +
        "bar(); // Noncompliant",
      Issue.create("msg1", 1));
  }

  @Test
  public void too_small_line_number() throws Exception {
    expect("Unexpected issue at line 1");
    check(
      "\nfoo(); // Noncompliant",
      Issue.create("msg1", 1));
  }

  @Test
  public void too_large_line_number() throws Exception {
    expect("Missing issue at line 1");
    check(
      "foo(); // Noncompliant",
      Issue.create("msg1", 2));
  }

  @Test
  public void right_message() throws Exception {
    check(
      "foo(); // Noncompliant {{msg1}}",
      Issue.create("msg1", 1));
  }

  @Test
  public void wrong_message() throws Exception {
    expect("Bad message at line 1");
    check(
      "foo(); // Noncompliant {{msg1}}",
      Issue.create("msg2", 1));
  }

  @Test
  public void right_effortToFix() throws Exception {
    check(
      "foo(); // Noncompliant [[effortToFix=42]] {{msg1}}",
      Issue.create("msg1", 1).effortToFix(42));
  }

  @Test
  public void wrong_effortToFix() throws Exception {
    expect("Bad effortToFix at line 1");
    check(
      "foo(); // Noncompliant [[effortToFix=42]] {{msg1}}",
      Issue.create("msg1", 1).effortToFix(77));
  }

  @Test
  public void invalid_param() throws Exception {
    thrown.expectMessage("Invalid param at line 1: xxx");
    check(
      "foo(); // Noncompliant [[xxx=1]] {{msg1}}",
      Issue.create("msg1", 1));
  }

  @Test
  public void invalid_param_syntax() throws Exception {
    thrown.expectMessage("Invalid param at line 1: zzz");
    check(
      "foo(); // Noncompliant [[zzz]] {{msg1}}",
      Issue.create("msg1", 1));
  }

  @Test
  public void right_precise_issue_location() throws Exception {
    check(
      "foo(); // Noncompliant [[sc=1;ec=4]]",
      Issue.create("msg1", 1).columns(1, 4));
  }

  @Test
  public void wrong_start_column() throws Exception {
    expect("Bad start column at line 1");
    check(
      "foo(); // Noncompliant [[sc=1;ec=4]]",
      Issue.create("msg1", 1).columns(2, 4));
  }

  @Test
  public void wrong_end_column() throws Exception {
    expect("Bad end column at line 1");
    check(
      "foo(); // Noncompliant [[sc=1;ec=4]]",
      Issue.create("msg1", 1).columns(1, 5));
  }

  @Test
  public void right_end_line() throws Exception {
    check(
      "foo(); // Noncompliant [[el=+1]]\n\n",
      Issue.create("msg1", 1).endLine(2));
  }

  @Test
  public void wrong_end_line() throws Exception {
    expect("Bad end line at line 1");
    check(
      "foo(); // Noncompliant [[el=+2]]\n\n",
      Issue.create("msg1", 1).endLine(2));
  }

  @Test
  public void right_secondary_locations() throws Exception {
    check(
      "foo(); // Noncompliant [[secondary=2,3]]",
      Issue.create("msg1", 1).secondary(2, 3));
  }

  @Test
  public void wrong_secondary_locations() throws Exception {
    expect("Bad secondary locations at line 1");
    check(
      "foo(); // Noncompliant [[secondary=2,3]]",
      Issue.create("msg1", 1).secondary(2, 4));
  }

  @Test
  public void unordered_issues() throws Exception {
    check(
      "foo(); // Noncompliant\n" +
        "bar(); // Noncompliant",
      Issue.create("msg1", 2), Issue.create("msg1", 1));
  }

  private void expect(String exceptionMessage) {
    thrown.expect(AssertionError.class);
    thrown.expectMessage(exceptionMessage);
  }

  private void check(String sourceCode, Issue... actualIssues) throws Exception {
    JavaScriptCheck check = new CheckStub(Arrays.asList(actualIssues));
    File fakeFile = folder.newFile("fakeFile.txt");
    Files.write(sourceCode, fakeFile, StandardCharsets.UTF_8);
    JavaScriptCheckVerifier.verify(check, fakeFile);
  }

  private static class CheckStub implements JavaScriptCheck {

    private final List<Issue> issues;

    public CheckStub(List<Issue> issues) {
      this.issues = issues;
    }

    @Override
    public TreeVisitorContext getContext() {
      return null;
    }

    @Override
    public void scanFile(TreeVisitorContext context) {
      for (Issue issue : issues) {
        log(issue, context);
      }
    }

    public void log(Issue issue, TreeVisitorContext context) {
      List<IssueLocation> secondaryLocations = new ArrayList<>();
      if (issue.secondaryLines() != null) {
        for (Integer secondaryLine : issue.secondaryLines()) {
          secondaryLocations.add(new IssueLocation(createTree(secondaryLine, 1, secondaryLine, 1), null));
        }
      }
      if (issue.startColumn() != null || issue.endLine() != null || issue.secondaryLines() != null) {
        Tree tree = createTree(issue.line(), issue.startColumn(), issue.endLine(), issue.endColumn());
        context.addIssue(this, new IssueLocation(tree, issue.message()), secondaryLocations, null);
      } else if (issue.effortToFix() == null) {
        context.addIssue(this, issue.line(), issue.message());
      } else {
        context.addIssue(this, issue.line(), issue.message(), issue.effortToFix());
      }
    }

    private Tree createTree(int line, Integer startColumn, Integer endLine, Integer endColumn) {
      JavaScriptTree tree = mock(JavaScriptTree.class);
      when(tree.getFirstToken()).thenReturn(createToken(line, startColumn, 1));
      when(tree.getLastToken()).thenReturn(createToken(endLine == null ? line : endLine, endColumn, 0));
      return tree;
    }

    private static InternalSyntaxToken createToken(int line, @Nullable Integer column, int length) {
      String tokenValue = StringUtils.repeat("x", length);
      int tokenColumn = column == null ? 0 : column - 1;
      return new InternalSyntaxToken(line, tokenColumn, tokenValue, ImmutableList.<SyntaxTrivia>of(), 0, false);
    }


  }

}
