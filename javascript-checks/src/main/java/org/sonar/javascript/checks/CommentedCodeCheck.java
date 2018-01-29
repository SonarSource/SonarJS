/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableSet;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import org.apache.commons.lang.StringUtils;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.JavaScriptCommentAnalyser;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "CommentedCode")
public class CommentedCodeCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove this commented out code.";
  private static final JavaScriptCommentAnalyser COMMENT_ANALYSER = new JavaScriptCommentAnalyser();
  private static final ActionParser<Tree> PARSER = JavaScriptParserBuilder.createParser();

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Kind.TOKEN);
  }

  @Override
  public void visitNode(Tree tree) {
    List<List<SyntaxTrivia>> commentGroups = groupComments((SyntaxToken) tree);
    commentGroups.forEach(this::checkCommentGroup);
  }

  private void checkCommentGroup(List<SyntaxTrivia> commentGroup) {
    String uncommentedText = uncomment(commentGroup);
    if (isRawExclusion(uncommentedText)) {
      return;
    }
    uncommentedText = injectMissingBraces(uncommentedText);

    try {
      ScriptTree parsedUncommentedText = (ScriptTree) PARSER.parse(uncommentedText);
      if (isExclusion(parsedUncommentedText)) {
        return;
      }
      IssueLocation primaryLocation = new IssueLocation(commentGroup.get(0), commentGroup.get(commentGroup.size() - 1), MESSAGE);
      addIssue(new PreciseIssue(this, primaryLocation));
    } catch (RecognitionException e) {
      // do nothing, it's just a comment
    }
  }

  private static boolean isRawExclusion(String uncommentedText) {
    return uncommentedText.trim().matches("}");
  }

  private static String injectMissingBraces(String uncommentedText) {
    StringBuilder toParse = new StringBuilder(uncommentedText);

    int openCurlyBraceNum = StringUtils.countMatches(uncommentedText, "{");
    int closeCurlyBraceNum = StringUtils.countMatches(uncommentedText, "}");

    final int missingBraces = openCurlyBraceNum - closeCurlyBraceNum;
    for (int i = 0; i < missingBraces; i++) {
      toParse.append("}");
    }
    for (int i = missingBraces; i < 0; i++) {
      toParse.insert(0, "{");
    }

    return toParse.toString();
  }

  private static String uncomment(List<SyntaxTrivia> triviaGroup) {
    StringBuilder uncommentedText = new StringBuilder();
    for (SyntaxTrivia trivia : triviaGroup) {
      String value = COMMENT_ANALYSER.getContents(trivia.text());
      uncommentedText.append("\n");
      uncommentedText.append(value);
    }
    return uncommentedText.toString().trim();
  }

  private static boolean isExclusion(ScriptTree scriptTree) {
    ModuleTree scriptContent = scriptTree.items();
    if (scriptContent == null) {
      return true;
    }

    if (scriptContent.items().size() == 1) {
      Tree statement = scriptContent.items().get(0);

      if (statement.is(Kind.LABELLED_STATEMENT, Kind.BREAK_STATEMENT, Kind.CONTINUE_STATEMENT)
        || isExpressionExclusion(statement)
        || isReturnThrowExclusion(statement)) {

        return true;
      }
    }

    return false;
  }

  private static boolean isReturnThrowExclusion(Tree item) {
    ExpressionTree expression = null;

    if (item.is(Kind.RETURN_STATEMENT)) {
      expression = ((ReturnStatementTree)item).expression();

    } else if (item.is(Kind.THROW_STATEMENT)) {
      expression = ((ThrowStatementTree) item).expression();
    }

    return expression != null && expression.is(Kind.IDENTIFIER_REFERENCE);
  }

  private static boolean isExpressionExclusion(Tree item) {
    if (item.is(Kind.EXPRESSION_STATEMENT)) {
      ExpressionStatementTree expressionStatement = (ExpressionStatementTree) item;

      if (expressionStatement.expression().is(Kind.IDENTIFIER_REFERENCE, Kind.UNARY_PLUS, Kind.UNARY_MINUS, Kind.STRING_LITERAL)
        || expressionStatement.semicolonToken() == null
        || expressionStatement.expression().is(Kind.COMMA_OPERATOR)) {

        return true;
      }
    }
    return false;
  }

  /**
   * Returns comments by groups which come sequentially, without empty lines between.
   */
  private static List<List<SyntaxTrivia>> groupComments(SyntaxToken token) {
    List<List<SyntaxTrivia>> groups = new LinkedList<>();
    List<SyntaxTrivia> currentGroup = null;

    for (SyntaxTrivia trivia : token.trivias()) {
      if (isJsDoc(trivia) || isJsLint(trivia) || isJsHint(trivia) || isGlobals(trivia)) {
        continue;
      }

      if (currentGroup == null) {
        currentGroup = initNewGroup(trivia);

      } else if (isAdjacent(trivia, currentGroup)) {
        currentGroup.add(trivia);

      } else {
        groups.add(currentGroup);
        currentGroup = initNewGroup(trivia);
      }
    }

    if (currentGroup != null) {
      groups.add(currentGroup);
    }
    return groups;
  }

  private static List<SyntaxTrivia> initNewGroup(SyntaxTrivia trivia) {
    List<SyntaxTrivia> group = new LinkedList<>();
    group.add(trivia);
    return group;
  }

  private static boolean isAdjacent(SyntaxTrivia trivia, List<SyntaxTrivia> currentGroup) {
    return currentGroup.get(currentGroup.size() - 1).line() + 1 == trivia.line();
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
