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
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.nio.charset.Charset;
import java.util.List;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.JavaScriptCommentAnalyser;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "CommentedCode",
  name = "Sections of code should not be \"commented out\"",
  priority = Priority.MAJOR,
  tags = {Tags.MISRA, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.UNDERSTANDABILITY)
@SqaleConstantRemediation("5min")
public class CommentedCodeCheck extends SubscriptionVisitorCheck implements CharsetAwareVisitor {

  private static final String MESSAGE = "Remove this commented out code.";
  private static final JavaScriptCommentAnalyser COMMENT_ANALYSER = new JavaScriptCommentAnalyser();
  private ActionParser<Tree> parser;

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.TOKEN);
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken token = (SyntaxToken) tree;
    for (SyntaxTrivia trivia : token.trivias()) {
      if (!isJsDoc(trivia) && !isJsLint(trivia) && !isJsHint(trivia) && !isGlobals(trivia)) {
        checkCommentText(trivia);
      }
    }
  }

  private void checkCommentText(SyntaxTrivia trivia) {
    String content = COMMENT_ANALYSER.getContents(trivia.text());

    if (content.endsWith("{")) {
      content += "}";
    }

    try {
      ScriptTree parsed = (ScriptTree)parser.parse(content);
      if (!isExclusion(parsed)) {
        addLineIssue(trivia, MESSAGE);
      }
    } catch (RecognitionException e) {
      // do nothing, it's just a comment
    }
  }

  private static boolean isExclusion(ScriptTree parsed) {
    if (isEmptyScriptTree(parsed)) {
      return true;
    }

    if (parsed.items().items().size() == 1) {
      Tree item = parsed.items().items().get(0);

      if (item.is(Kind.LABELLED_STATEMENT) || isExpressionExclusion(item) || isReturnThrowExclusion(item) || isBreakContinueExclusion(item)) {
        return true;
      }
    }

    return false;
  }

  private static boolean isEmptyScriptTree(ScriptTree parsed) {
    return parsed.items() == null || parsed.items().items().isEmpty();
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

      if (expressionStatement.semicolonToken() == null || expressionStatement.expression().is(Kind.COMMA_OPERATOR)) {
        return true;
      }
    }
    return false;
  }

  private static boolean isBreakContinueExclusion(Tree item) {
    return item.is(Kind.BREAK_STATEMENT, Kind.CONTINUE_STATEMENT) && !endsWithSemicolon((JavaScriptTree) item);
  }

  private static boolean endsWithSemicolon(JavaScriptTree item) {
    return ";".equals(item.getLastToken().text());
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

  @Override
  public void setCharset(Charset charset) {
    this.parser = JavaScriptParserBuilder.createParser(charset);
  }
}
