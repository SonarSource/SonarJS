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
package org.sonar.javascript.checks;

import java.io.File;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import com.google.common.base.Charsets;
import com.google.common.base.Function;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Ordering;
import com.google.common.primitives.Ints;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptCheckVerifier extends SubscriptionBaseTreeVisitor {

  private final List<Issue> expectedIssues = new ArrayList<>();

  public static void verify(JavaScriptCheck check, File file) {
    VerifierContext context = new VerifierContext(file, check);
    check.scanFile(context);
    JavaScriptCheckVerifier verifier = new JavaScriptCheckVerifier();
    verifier.verify(context);
  }

  private void verify(VerifierContext context) {
    scanTree(context.getTopTree());
    List<Issue> sortedIssues = Ordering.natural().onResultOf(new IssueToLine()).sortedCopy(context.getIssues());
    Iterator<Issue> actualIssues = sortedIssues.iterator();
    for (Issue expected : expectedIssues) {
      if (actualIssues.hasNext()) {
        Issue actual = actualIssues.next();
        verifyIssue(expected, actual);
      } else {
        Issue issue = expected;
        throw new AssertionError("Missing issue at line " + issue.line);
      }
    }
    if (actualIssues.hasNext()) {
      Issue issue = actualIssues.next();
      throw new AssertionError("Unexpected issue at line " + issue.line + ": \"" + issue.message + "\"");
    }
  }

  private void verifyIssue(Issue expected, Issue actual) {
    if (actual.line > expected.line) {
      throw new AssertionError("Missing issue at line " + expected.line);
    }
    if (actual.line < expected.line) {
      throw new AssertionError("Unexpected issue at line " + actual.line + ": \"" + actual.message + "\"");
    }
    if (expected.message != null) {
      assertThat(actual.message).as("Bad message at line " + expected.line).isEqualTo(expected.message);
    }
    if (expected.effortToFix != null) {
      assertThat(actual.effortToFix).as("Bad effortToFix at line " + expected.line).isEqualTo(expected.effortToFix);
    }
    if (expected.startColumn != null) {
      assertThat(actual.startColumn).as("Bad start column at line " + expected.line).isEqualTo(expected.startColumn);
    }
    if (expected.endColumn != null) {
      assertThat(actual.endColumn).as("Bad end column at line " + expected.line).isEqualTo(expected.endColumn);
    }
    if (expected.endLine != null) {
      assertThat(actual.endLine).as("Bad end line at line " + expected.line).isEqualTo(expected.endLine);
    }
    if (expected.secondaryLines != null) {
      assertThat(actual.secondaryLines).as("Bad secondary locations at line " + expected.line).isEqualTo(expected.secondaryLines);
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
        Issue issue = issue(null, trivia.line());
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

  private void addParams(Issue issue, String params) {
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
        issue.endLine(lineValue(issue.line, value));
      } else if ("secondary".equalsIgnoreCase(name)) {
        List<Integer> secondaryLines = new ArrayList<>();
        for (String secondary : Splitter.on(',').split(value)) {
          secondaryLines.add(lineValue(issue.line, secondary));
        }
        issue.secondary(secondaryLines);
      } else {
        throw new IllegalStateException("Invalid param at line 1: " + name);
      }
    }
  }
  
  private int lineValue(int baseLine, String value) {
    if (value.startsWith("+")) {
      return baseLine + Integer.valueOf(value.substring(1));
    }
    if (value.startsWith("-")) {
      return baseLine - Integer.valueOf(value.substring(1));
    }
    return Integer.valueOf(value);
  }

  public static class Issue {

    private String message;
    private final int line;
    private Integer effortToFix;
    private Integer startColumn;
    private Integer endColumn;
    private Integer endLine;
    private List<Integer> secondaryLines = null;

    public Issue(String message, int line) {
      this.message = message;
      this.line = line;
    }

    public static Issue create(String message, int lineNumber) {
      return new Issue(message, lineNumber);
    }

    public Issue message(String message) {
      this.message = message;
      return this;
    }

    public Issue columns(int startColumn, int endColumn) {
      startColumn(startColumn);
      endColumn(endColumn);
      return this;
    }
    
    public Issue startColumn(int startColumn) {
      this.startColumn = startColumn;
      return this;
    }

    public Issue endColumn(int endColumn) {
      this.endColumn = endColumn;
      return this;
    }
    
    public Issue effortToFix(int effortToFix) {
      this.effortToFix = effortToFix;
      return this;
    }
    
    public Issue endLine(int endLine) {
      this.endLine = endLine;
      return this;
    }

    public Issue secondary(int... lines) {
      return secondary(Ints.asList(lines));
    }
    
    public Issue secondary(List<Integer> secondaryLines) {
      this.secondaryLines = secondaryLines;
      return this;
    }

    public void log(TreeVisitorContext context, JavaScriptCheck check) {
      List<IssueLocation> secondaryLocations = new ArrayList<>();
      if (secondaryLines != null) {
        for (Integer secondaryLine : secondaryLines) {
          secondaryLocations.add(new IssueLocation(createTree(secondaryLine, 1, secondaryLine, 1), null));
        }
      }
      if (startColumn != null || endLine != null || secondaryLines != null) {
        Tree tree = createTree(line, startColumn, endLine, endColumn);
        context.addIssue(check, new IssueLocation(tree, message), secondaryLocations, null);
      } else if (effortToFix == null) {
        context.addIssue(check, line, message);
      } else {
        context.addIssue(check, line, message, effortToFix);
      }
    }

    private Tree createTree(int line, Integer startColumn, Integer endLine, Integer endColumn) {
      JavaScriptTree tree = mock(JavaScriptTree.class);
      when(tree.getFirstToken()).thenReturn(createToken(line, startColumn, 1));
      when(tree.getLastToken()).thenReturn(createToken(endLine == null ? line : endLine, endColumn, 0));
      return tree;
    }

    private InternalSyntaxToken createToken(int line, Integer column, int length) {
      String tokenValue = StringUtils.repeat("x", length);
      int tokenColumn = column == null ? 0 : column - 1;
      return new InternalSyntaxToken(line, tokenColumn, tokenValue, ImmutableList.<SyntaxTrivia>of(), 0, false);
    }

  }
  
  private static Issue issue(String message, int lineNumber) {
    return new Issue(message, lineNumber);
  }

  private static class VerifierContext implements TreeVisitorContext {

    protected static final ActionParser<Tree> p = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

    private File file;
    private ComplexityVisitor complexityVisitor;
    private ScriptTree tree = null;
    private SymbolModel symbolModel = null;
    private List<Issue> issues = new ArrayList<>();

    public VerifierContext(File file, JavaScriptCheck check) {
      this.file = file;
      this.complexityVisitor = new ComplexityVisitor();

      try {
        this.tree = (ScriptTree) p.parse(file);
        this.symbolModel = SymbolModelImpl.create(tree, null, null);

      } catch (RecognitionException e) {
        throw new IllegalArgumentException("Unable to parse file: " + file.getAbsolutePath(), e);
      }

    }

    public List<Issue> getIssues() {
      return issues;
    }

    @Override
    public ScriptTree getTopTree() {
      return tree;
    }

    @Override
    public void addIssue(JavaScriptCheck check, Tree tree, String message) {
      addIssue(check, getLine(tree), message);
    }

    @Override
    public void addIssue(JavaScriptCheck check, int line, String message) {
      add(issue(message, line));
    }

    @Override
    public void addIssue(JavaScriptCheck check, Tree tree, String message, double cost) {
      addIssue(check, getLine(tree), message, cost);
    }

    @Override
    public void addIssue(JavaScriptCheck check, int line, String message, double cost) {
      add(issue(message, line).effortToFix((int) cost));
    }

    @Override
    public void addIssue(JavaScriptCheck check, IssueLocation location, List<IssueLocation> secondaryLocations, Double cost) {
      int startColumn = location.startLineOffset() + 1;
      int endColumn = location.endLineOffset() + 1;
      List<Integer> secondaryLines = new ArrayList<>();
      for (IssueLocation secondary : secondaryLocations) {
        secondaryLines.add(secondary.startLine());
      }
      Issue issue = issue(location.message(), location.startLine())
        .columns(startColumn, endColumn)
        .endLine(location.endLine())
        .secondary(secondaryLines);
      add(issue);
    }
    
    @Override
    public void addFileIssue(JavaScriptCheck check, String message) {
      throw new UnsupportedOperationException();
    }

    private void add(Issue issue) {
      issues.add(issue);
    }

    @Override
    public File getFile() {
      return file;
    }

    @Override
    public SymbolModel getSymbolModel() {
      return symbolModel;
    }

    @Override
    public int getComplexity(Tree tree) {
      return complexityVisitor.getComplexity(tree);
    }

    private static int getLine(Tree tree) {
      return ((JavaScriptTree) tree).getLine();
    }

    @Override
    public String[] getPropertyValues(String name) {
      throw new UnsupportedOperationException();
    }

  }

  private static class IssueToLine implements Function<Issue,Integer> {
    @Override
    public Integer apply(Issue issue) {
      return issue.line;
    }
  }

}
