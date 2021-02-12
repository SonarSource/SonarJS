/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.api.tree.expression;

import com.google.common.annotations.Beta;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

/**
 * ECMAScript 6 feature
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-arrow-function-definitions">Arrow function</a>.
 * <p/>
 * <p/>
 * <pre>
 *   {@link #parameterClause()} => {@link #body()}
 * </pre>
 * <p/>
 * <p>This interface is not intended to be implemented by clients.</p>
 */
@Beta
public interface ArrowFunctionTree extends ExpressionTree, FunctionTree {

  /**
   * Either {@link IdentifierTree} or {@link ParameterListTree} ({@link Tree.Kind#PARAMETER_LIST})
   */
  @Override
  Tree parameterClause();

  @Nullable
  FlowTypeAnnotationTree returnType();

  SyntaxToken doubleArrowToken();

  /**
   * Either {@link BlockTree} or {@link ExpressionTree}
   */
  @Override
  Tree body();

}
