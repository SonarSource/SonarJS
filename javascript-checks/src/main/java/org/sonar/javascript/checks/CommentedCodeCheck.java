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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.commons.lang.StringUtils;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.tree.JavaScriptCommentAnalyser;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.recognizer.CodeRecognizer;
import org.sonar.squidbridge.recognizer.Detector;
import org.sonar.squidbridge.recognizer.EndWithDetector;
import org.sonar.squidbridge.recognizer.KeywordsDetector;
import org.sonar.squidbridge.recognizer.LanguageFootprint;

@Rule(
  key = "CommentedCode",
  name = "Sections of code should not be \"commented out\"",
  priority = Priority.MAJOR,
  tags = {Tags.MISRA, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class CommentedCodeCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove this commented out code.";

  private static final JavaScriptCommentAnalyser COMMENT_ANALYSER = new JavaScriptCommentAnalyser();

  private static final double THRESHOLD = 0.9;

  private final CodeRecognizer codeRecognizer = new CodeRecognizer(THRESHOLD, new JavaScriptRecognizer());
  private final Pattern regexpToDivideStringByLine = Pattern.compile("(\r?\n)|(\r)");

  private static class JavaScriptRecognizer implements LanguageFootprint {

    @Override
    public Set<Detector> getDetectors() {
      return ImmutableSet.of(
        new EndWithDetector(0.95, '}', ';', '{'),
        new KeywordsDetector(0.3, JavaScriptKeyword.keywordValues()),
        new ContainsDetectorJS(0.95, "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|="),
        new ContainsDetectorJS(0.95, "!=", "!=="));
    }

  }

  private static class ContainsDetectorJS extends Detector {

    private final List<String> strs;

    public ContainsDetectorJS(double probability, String... strs) {
      super(probability);
      this.strs = Arrays.asList(strs);
    }

    @Override
    public int scan(String line) {
      int matchers = 0;
      for (String str : strs) {
        matchers += StringUtils.countMatches(line, str);
      }
      return matchers;
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
      if (!isJsDoc(trivia) && !isJsLint(trivia) && !isJsHint(trivia) && !isGlobals(trivia)) {
        String[] lines = regexpToDivideStringByLine.split(COMMENT_ANALYSER.getContents(trivia.text()));
        for (int lineOffset = 0; lineOffset < lines.length; lineOffset++) {
          if (codeRecognizer.isLineOfCode(lines[lineOffset])) {
            addIssue(new LineIssue(this, trivia.line() + lineOffset, MESSAGE));
            break;
          }
        }
      }
    }
  }

  private static boolean isJsDoc(SyntaxTrivia trivia) {
    return trivia.text().startsWith("/**");
  }

  private static boolean isJsLint(SyntaxTrivia trivia) {
    return trivia.text().startsWith("/*jslint");
  }

  private static boolean isJsHint(SyntaxTrivia trivia) {
    return trivia.text().startsWith("/*jshint");
  }

  private static boolean isGlobals(SyntaxTrivia trivia) {
    return trivia.text().startsWith("/*global");
  }

}
