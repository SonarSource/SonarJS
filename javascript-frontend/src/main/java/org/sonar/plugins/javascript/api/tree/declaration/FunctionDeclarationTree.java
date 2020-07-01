/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript.api.tree.declaration;

import com.google.common.annotations.Beta;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;

/**
 * <a href="http://www.ecma-international.org/ecma-262/5.1/#sec-13">Function declaration</a>,
 * <a href="https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generator-function-definitions">Generator function declaration</a>
 * (<a href="http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts">ES6</a>).
 * <p/>
 * <pre>
 *    {@link Tree.Kind#FUNCTION_DECLARATION function} {@link #name()} ( {@link #parameterClause()} ) {@link #body()}
 *    {@link Tree.Kind#GENERATOR_DECLARATION function} * {@link #name()} ( {@link #parameterClause()} ) {@link #body()}
 * </pre>
 */
@Beta
public interface FunctionDeclarationTree extends StatementTree, FunctionTree {

  SyntaxToken functionKeyword();

  @Nullable
  SyntaxToken starToken();

  @Override
  IdentifierTree name();

  @Override
  ParameterListTree parameterClause();

  @Override
  @Nullable
  FlowTypeAnnotationTree returnType();

  @Override
  BlockTree body();

}
