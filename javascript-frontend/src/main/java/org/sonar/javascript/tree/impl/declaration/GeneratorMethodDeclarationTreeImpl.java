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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.impl.statement.BlockTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class GeneratorMethodDeclarationTreeImpl extends JavaScriptTree implements GeneratorMethodDeclarationTree {

  private final Kind kind;
  private InternalSyntaxToken staticToken;
  private final InternalSyntaxToken starToken;
  private final ExpressionTree name;
  private final ParameterListTreeImpl parameters;
  private final BlockTreeImpl body;

  public GeneratorMethodDeclarationTreeImpl(
    @Nullable InternalSyntaxToken staticToken, InternalSyntaxToken starToken,
    ExpressionTree name,
    ParameterListTreeImpl parameters,
    BlockTreeImpl body
  ) {

    this.staticToken = staticToken;
    this.kind = Kind.GENERATOR_METHOD;
    this.starToken = starToken;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
  }

  @Nullable
  @Override
  public SyntaxToken staticToken() {
    return staticToken;
  }

  @Override
  public SyntaxToken starToken() {
    Preconditions.checkState(this.is(Kind.GENERATOR_METHOD));
    return starToken;
  }

  @Override
  public ExpressionTree name() {
    return name;
  }

  @Override
  public ParameterListTree parameterClause() {
    return parameters;
  }

  @Override
  public BlockTreeImpl body() {
    return body;
  }

  @Override
  public List<Tree> parameterList() {
    return parameters.parameters();
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(staticToken, starToken, name, parameters, body);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitMethodDeclaration(this);
  }
}
