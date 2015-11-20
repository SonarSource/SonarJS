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

import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.sensor.issue.Issue;
import org.sonar.api.batch.sensor.issue.internal.DefaultIssueBuilder;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import com.google.common.base.Charsets;
import com.google.common.base.Splitter;
import com.google.common.collect.ImmutableList;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptCheckVerifier extends SubscriptionBaseTreeVisitor {

  private static final RuleKey RULE_KEY = RuleKey.of("repo", "rule1");

  private final List<Issue> expectedIssues = new ArrayList<>();

  public static void verify(JavaScriptCheck check, File file) {
    VerifierContext context = new VerifierContext(file, check);
    check.scanFile(context);
    JavaScriptCheckVerifier verifier = new JavaScriptCheckVerifier();
    verifier.verify(context);
  }

  private void verify(VerifierContext context) {
    scanTree(context.getTopTree());
    Iterator<Issue> actualIssues = context.getIssues().iterator();
    for (Issue expected : expectedIssues) {
      if (actualIssues.hasNext()) {
        Issue actual = actualIssues.next();
        verifyIssue(expected, actual);
      } else {
        Issue issue = expected;
        throw new AssertionError("Missing issue at line " + issue.line());
      }
    }
    if (actualIssues.hasNext()) {
      Issue issue = actualIssues.next();
      throw new AssertionError("Unexpected issue at line " + issue.line() + ": \"" + issue.message() + "\"");
    }
  }

  private void verifyIssue(Issue expected, Issue actual) {
    if (actual.line() > expected.line()) {
      throw new AssertionError("Missing issue at line " + expected.line());
    }
    if (actual.line() < expected.line()) {
      throw new AssertionError("Unexpected issue at line " + actual.line() + ": \"" + actual.message() + "\"");
    }
    if (expected.message() != null) {
      assertThat(actual.message()).as("Bad message at line " + expected.line()).isEqualTo(expected.message());
    }
    if (expected.effortToFix() != null) {
      assertThat(actual.effortToFix()).as("Bad effortToFix at line " + expected.line()).isEqualTo(expected.effortToFix());
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
        DefaultIssueBuilder issueBuilder = issue(null).atLine(trivia.line());
        String paramsAndMessage = text.substring(marker.length()).trim();
        if (paramsAndMessage.startsWith("[[")) {
          int endIndex = paramsAndMessage.indexOf("]]");
          addParams(issueBuilder, paramsAndMessage.substring(2, endIndex));
          paramsAndMessage = paramsAndMessage.substring(endIndex + 2).trim();
        }
        if (paramsAndMessage.startsWith("{{")) {
          int endIndex = paramsAndMessage.indexOf("}}");
          String message = paramsAndMessage.substring(2, endIndex);
          issueBuilder.message(message);
        }
        expectedIssues.add(issueBuilder.build());
      }
    }
  }

  private void addParams(DefaultIssueBuilder issueBuilder, String params) {
    for (String param : Splitter.on(';').split(params)) {
      int equalIndex = param.indexOf("=");
      if (equalIndex == -1) {
        throw new IllegalStateException("Invalid param at line 1: " + param);
      }
      String name = param.substring(0, equalIndex);
      String value = param.substring(equalIndex + 1);
      if ("effortToFix".equalsIgnoreCase(name)) {
        issueBuilder.effortToFix(Double.valueOf(value));
      } else {
        throw new IllegalStateException("Invalid param at line 1: " + name);
      }
    }
  }

  private static DefaultIssueBuilder issue(String message) {
    return new DefaultIssueBuilder()
      .ruleKey(RULE_KEY)
      .onFile(new DefaultInputFile("fakeFile"))
      .message(message);
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
      add(issue(message).atLine(line));
    }

    @Override
    public void addIssue(JavaScriptCheck check, Tree tree, String message, double cost) {
      addIssue(check, getLine(tree), message, cost);
    }

    @Override
    public void addIssue(JavaScriptCheck check, int line, String message, double cost) {
      add(issue(message).atLine(line).effortToFix(cost));
    }

    @Override
    public void addFileIssue(JavaScriptCheck check, String message) {
      add(issue(message));
    }

    private void add(DefaultIssueBuilder issueBuilder) {
      issues.add(issueBuilder.build());
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

}
