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

import com.google.common.collect.Maps;
import com.sonar.sslr.api.AstNode;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.BlockTree;
import org.sonar.javascript.model.EmptyStatementTree;
import org.sonar.javascript.model.LabelledStatementTree;
import org.sonar.javascript.model.StatementTree;
import org.sonar.javascript.model.TreeVisitor;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.Map;

@Rule(
  key = "OneStatementPerLine",
  priority = Priority.MAJOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class OneStatementPerLineCheck extends SquidCheck<LexerlessGrammar> implements TreeVisitor {

  private final Map<Integer, Integer> statementsPerLine = Maps.newHashMap();

  @Override
  public void visitFile(AstNode astNode) {
    statementsPerLine.clear();
  }

  public void visit(StatementTree statementTree) {
    if (statementTree.is(BlockTree.class) || statementTree.is(EmptyStatementTree.class) || statementTree.is(LabelledStatementTree.class)) {
      // skip
    } else {
      int line = statementTree.getLine();
      if (!statementsPerLine.containsKey(line)) {
        statementsPerLine.put(line, 0);
      }
      statementsPerLine.put(line, statementsPerLine.get(line) + 1);
    }
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
