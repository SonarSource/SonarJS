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

import java.util.Map;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "OneStatementPerLine",
  name = "Do not use more that one statement per line",
  priority = Priority.MAJOR,
  tags = {Tags.CONVENTION})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("10min")
public class OneStatementPerLineCheck extends SquidCheck<LexerlessGrammar> {

  private final Map<Integer, Integer> statementsPerLine = Maps.newHashMap();

  @Override
  public void init() {
    subscribeTo(
      Kind.VARIABLE_STATEMENT,
      Kind.EXPRESSION_STATEMENT,
      Kind.IF_STATEMENT,
      Kind.DO_WHILE_STATEMENT,
      Kind.WHILE_STATEMENT,
      Kind.FOR_IN_STATEMENT,
      Kind.FOR_OF_STATEMENT,
      Kind.FOR_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.BREAK_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.WITH_STATEMENT,
      Kind.SWITCH_STATEMENT,
      Kind.THROW_STATEMENT,
      Kind.TRY_STATEMENT,
      Kind.DEBUGGER_STATEMENT);
  }

  @Override
  public void visitNode(AstNode astNode) {
    int line = astNode.getTokenLine();
    if (!statementsPerLine.containsKey(line)) {
      statementsPerLine.put(line, 0);
    }
    statementsPerLine.put(line, statementsPerLine.get(line) + 1);

  }

  @Override
  public void visitFile(AstNode astNode) {
    statementsPerLine.clear();
  }

  @Override
  public void leaveFile(AstNode astNode) {
    for (Map.Entry<Integer, Integer> statementsAtLine : statementsPerLine.entrySet()) {
      if (statementsAtLine.getValue() > 1) {
        getContext().createLineViolation(this, "At most one statement is allowed per line, but {0} statements were found on this line.", statementsAtLine.getKey(),
          statementsAtLine.getValue());
      }
    }
  }

}
