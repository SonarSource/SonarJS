/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.util.List;

@Rule(
  key = "S1067",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class ExpressionComplexityCheck extends SquidCheck<LexerlessGrammar> {

  private List<ExpressionComplexity> statementLevel = Lists.newArrayList();
  private static final int DEFAULT = 3;
  private static final GrammarRuleKey[] LOGICAL_AND_CONDITIONAL_EXPRS = {
    Kind.CONDITIONAL_EXPRESSION,
    Kind.CONDITIONAL_AND,
    Kind.CONDITIONAL_OR
  };
  private static final GrammarRuleKey[] EXPRESSIONS = {
    EcmaScriptGrammar.EXPRESSION,
    EcmaScriptGrammar.EXPRESSION_NO_IN
  };

  @RuleProperty(defaultValue = "" + DEFAULT)
  public int max = DEFAULT;

  public static class ExpressionComplexity {
    private int nestedLevel = 0;
    private int counterOperator = 0;

    public void increaseOperatorCounter(int nbOperator) {
      counterOperator += nbOperator;
    }

    public void incrementNestedExprLevel() {
      nestedLevel++;
    }

    public void decrementNestedExprLevel() {
      nestedLevel--;
    }

    public boolean isOnFirstExprLevel() {
      return nestedLevel == 0;
    }

    public int getExprNumberOfOperator() {
      return counterOperator;
    }

    public void resetExprOperatorCounter() {
      counterOperator = 0;
    }
  }

  @Override
  public void visitFile(@Nullable AstNode astNode) {
    statementLevel.clear();
    statementLevel.add(new ExpressionComplexity());
  }

  @Override
  public void init() {
    subscribeTo(Kind.FUNCTION_EXPRESSION);
    subscribeTo(EXPRESSIONS);
    subscribeTo(LOGICAL_AND_CONDITIONAL_EXPRS);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (isExpression(astNode)) {
      Iterables.getLast(statementLevel).incrementNestedExprLevel();
    }
    if (astNode.is(LOGICAL_AND_CONDITIONAL_EXPRS)) {
      Iterables.getLast(statementLevel).increaseOperatorCounter(
        astNode.getChildren(
          EcmaScriptPunctuator.OROR,
          EcmaScriptPunctuator.ANDAND,
          EcmaScriptPunctuator.QUERY).size());
    }
    if (astNode.is(Kind.FUNCTION_EXPRESSION)) {
      statementLevel.add(new ExpressionComplexity());
    }
  }

  @Override
  public void leaveNode(AstNode astNode) {
    if (isExpression(astNode)) {
      ExpressionComplexity currentExpression = Iterables.getLast(statementLevel);
      currentExpression.decrementNestedExprLevel();

      if (currentExpression.isOnFirstExprLevel()) {
        if (currentExpression.getExprNumberOfOperator() > max) {
          getContext().createLineViolation(this,
            "Reduce the number of conditional operators (" + currentExpression.getExprNumberOfOperator() + ") used in the expression (maximum allowed " + max + ").",
            astNode);
        }
        currentExpression.resetExprOperatorCounter();
      }
    } else if (astNode.is(Kind.FUNCTION_EXPRESSION)) {
      statementLevel.remove(statementLevel.size() - 1);
    }

  }

  public static boolean isExpression(AstNode node) {
    return node.is(EXPRESSIONS) || isLogicalOrConditionalExpr(node);
  }

  public static boolean isLogicalOrConditionalExpr(AstNode node) {
    return node.is(LOGICAL_AND_CONDITIONAL_EXPRS) && node.getParent().isNot(EcmaScriptGrammar.EXPRESSION);
  }
}
