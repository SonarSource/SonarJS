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
package org.sonar.javascript.checks.utils;

import com.google.common.base.Function;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Ordering;
import java.io.File;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.fest.assertions.Assertions;
import org.sonar.javascript.JavaScriptCheckContext;
import org.sonar.javascript.checks.tests.TestIssue;
import org.sonar.javascript.checks.tests.TestUtils;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

public class JavaScriptCheckVerifier extends SubscriptionVisitorCheck {

  private final List<TestIssue> expectedIssues = new ArrayList<>();


  public static void verify(JavaScriptCheck check, File file) {
    JavaScriptCheckVerifier javaScriptCheckVerifier = new JavaScriptCheckVerifier();
    JavaScriptCheckContext context = TestUtils.createContext(file);
    javaScriptCheckVerifier.scanFile(context);
    List<TestIssue> expectedIssues = javaScriptCheckVerifier.expectedIssues;
    Iterator<Issue> actualIssues = getActualIssues(check, context);


    for (TestIssue expected : expectedIssues) {
      if (actualIssues.hasNext()) {
        verifyIssue(expected, actualIssues.next());
      } else {
        throw new AssertionError("Missing issue at line " + expected.line());
      }
    }

    if (actualIssues.hasNext()) {
      Issue issue = actualIssues.next();
      throw new AssertionError("Unexpected issue at line " + line(issue) + ": \"" + message(issue) + "\"");
    }
  }

  private static Iterator<Issue> getActualIssues(JavaScriptCheck check, JavaScriptCheckContext context) {
    List<Issue> issues = check.scanFile(context);
    List<Issue> sortedIssues = Ordering.natural().onResultOf(new IssueToLine()).sortedCopy(issues);
    return sortedIssues.iterator();
  }

  private static void verifyIssue(TestIssue expected, Issue actual) {
    if (line(actual) > expected.line()) {
      throw new AssertionError("Missing issue at line " + expected.line());
    }
    if (line(actual) < expected.line()) {
      throw new AssertionError("Unexpected issue at line " + line(actual) + ": \"" + message(actual) + "\"");
    }
    if (expected.message() != null) {
      Assertions.assertThat(message(actual)).as("Bad message at line " + expected.line()).isEqualTo(expected.message());
    }
    if (expected.effortToFix() != null) {
      Assertions.assertThat(actual.cost()).as("Bad effortToFix at line " + expected.line()).isEqualTo(expected.effortToFix());
    }
    if (expected.startColumn() != null) {
      Assertions.assertThat(((PreciseIssue) actual).primaryLocation().startLineOffset() + 1).as("Bad start column at line " + expected.line()).isEqualTo(expected.startColumn());
    }
    if (expected.endColumn() != null) {
      Assertions.assertThat(((PreciseIssue) actual).primaryLocation().endLineOffset() + 1).as("Bad end column at line " + expected.line()).isEqualTo(expected.endColumn());
    }
    if (expected.endLine() != null) {
      Assertions.assertThat(((PreciseIssue) actual).primaryLocation().endLine()).as("Bad end line at line " + expected.line()).isEqualTo(expected.endLine());
    }
    if (expected.secondaryLines() != null) {
      Assertions.assertThat(secondary(actual)).as("Bad secondary locations at line " + expected.line()).isEqualTo(expected.secondaryLines());
    }
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.TOKEN);
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken token = (SyntaxToken) tree;
    for (SyntaxTrivia trivia : token.trivias()) {

      String text = trivia.text().substring(2).trim();
      String marker = "Noncompliant";

      if (text.startsWith(marker)) {
        TestIssue issue = issue(null, trivia.line());
        String paramsAndMessage = text.substring(marker.length()).trim();

        if (paramsAndMessage.startsWith("[[")) {
          int endIndex = paramsAndMessage.indexOf("]]");
          addParams(issue, paramsAndMessage.substring(2, endIndex));
          paramsAndMessage = paramsAndMessage.substring(endIndex + 2).trim();
        }

        if (paramsAndMessage.startsWith("{{")) {
          int endIndex = paramsAndMessage.indexOf("}}");
          String message = paramsAndMessage.substring(2, endIndex);
          issue.message(message);
        }

        expectedIssues.add(issue);
      }
    }
  }

  private void addParams(TestIssue issue, String params) {
    for (String param : Splitter.on(';').split(params)) {
      int equalIndex = param.indexOf("=");
      if (equalIndex == -1) {
        throw new IllegalStateException("Invalid param at line 1: " + param);
      }
      String name = param.substring(0, equalIndex);
      String value = param.substring(equalIndex + 1);

      if ("effortToFix".equalsIgnoreCase(name)) {
        issue.effortToFix(Integer.valueOf(value));

      } else if ("sc".equalsIgnoreCase(name)) {
        issue.startColumn(Integer.valueOf(value));

      } else if ("ec".equalsIgnoreCase(name)) {
        issue.endColumn(Integer.valueOf(value));

      } else if ("el".equalsIgnoreCase(name)) {
        issue.endLine(lineValue(issue.line(), value));

      } else if ("secondary".equalsIgnoreCase(name)) {
        List<Integer> secondaryLines = new ArrayList<>();
        for (String secondary : Splitter.on(',').split(value)) {
          secondaryLines.add(lineValue(issue.line(), secondary));
        }
        issue.secondary(secondaryLines);

      } else {
        throw new IllegalStateException("Invalid param at line 1: " + name);
      }
    }
  }

  private int lineValue(int baseLine, String shift) {
    if (shift.startsWith("+")) {
      return baseLine + Integer.valueOf(shift.substring(1));
    }
    if (shift.startsWith("-")) {
      return baseLine - Integer.valueOf(shift.substring(1));
    }
    return Integer.valueOf(shift);
  }

  private static TestIssue issue(@Nullable String message, int lineNumber) {
    return TestIssue.create(message, lineNumber);
  }

  private static class IssueToLine implements Function<Issue, Integer> {
    @Override
    public Integer apply(Issue issue) {
      return line(issue);
    }
  }

  private static int line(Issue issue) {
    if (issue instanceof PreciseIssue) {
      return ((PreciseIssue) issue).primaryLocation().startLine();
    } else {
      return ((LineIssue) issue).line();
    }
  }

  private static String message(Issue issue) {
    if (issue instanceof PreciseIssue) {
      return ((PreciseIssue) issue).primaryLocation().message();
    } else {
      return ((LineIssue) issue).message();
    }
  }

  private static List<Integer> secondary(Issue issue) {
    List<Integer> result = new ArrayList<>();

    if (issue instanceof PreciseIssue) {
      for (IssueLocation issueLocation : ((PreciseIssue) issue).secondaryLocations()) {
        result.add(issueLocation.startLine());
      }
    }
    return result;
  }


}
