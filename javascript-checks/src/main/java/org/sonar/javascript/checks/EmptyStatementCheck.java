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

import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.EmptyStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S1116")
public class EmptyStatementCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this empty statement.";

  /**
   * The empty statements for which no issue is raised.
   */
  private Set<EmptyStatementTree> exceptedStatements;

  @Override
  public void visitScript(ScriptTree tree) {
    // initialization
    exceptedStatements = new HashSet<>();
    
    // in many libraries the script starts with a ";". We raise no issue for such leading empty statement
    ModuleTree module = tree.items();
    if (module != null && !module.items().isEmpty()) {
      except(module.items().get(0));
    }

    super.visitScript(tree);
  }

  /**
   * In
   * <pre>
   * if (a)
   *  ;
   * else
   *  ;
   * </pre>
   * the semicolons are necessary (so no issue is raised) as there are no curly brackets.
   */
  @Override
  public void visitIfStatement(IfStatementTree tree) {
    except(tree.statement());

    super.visitIfStatement(tree);
  }
  
  /**
   * Same as <code>visitIfStatement</code>.
   */
  @Override
  public void visitElseClause(ElseClauseTree tree) {
    except(tree.statement());

    super.visitElseClause(tree);
  }

  /**
   * In
   * <pre>
   * for (i = 0; i < arr.length; arr[i++] = 0);
   * </pre>
   * the semicolon is necessary (so no issue is raised) as there are no curly brackets.
   */
  @Override
  public void visitForStatement(ForStatementTree tree) {
    except(tree.statement());

    super.visitForStatement(tree);
  }

  /**
   * Same as <code>visitForStatement</code>.
   */
  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    except(tree.statement());

    super.visitWhileStatement(tree);
  }

  @Override
  public void visitEmptyStatement(EmptyStatementTree tree) {
    if (!exceptedStatements.contains(tree)) {
      addIssue(tree, MESSAGE);
    }
  }

  private void except(Tree tree) {
    if (tree.is(Tree.Kind.EMPTY_STATEMENT)) {
      exceptedStatements.add((EmptyStatementTree)tree);
    }
  }

}
