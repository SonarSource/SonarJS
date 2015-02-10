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
package org.sonar.javascript.model.implementations.declaration;

import com.google.common.collect.Iterators;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.expression.IdentifierTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.implementations.statement.BlockTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.BlockTree;

import javax.annotation.Nullable;

import java.util.Iterator;

public class FunctionDeclarationTreeImpl extends JavaScriptTree implements FunctionDeclarationTree {

  private final SyntaxToken functionKeyword;
  private final SyntaxToken starToken;
  private final IdentifierTree name;
  private final ParameterListTree parameters;
  private final BlockTree body;
  private final Kind kind;

  public FunctionDeclarationTreeImpl(InternalSyntaxToken functionKeyword, InternalSyntaxToken starToken,
    IdentifierTreeImpl name, ParameterListTreeImpl parameters, BlockTreeImpl body) {

    super(Kind.GENERATOR_DECLARATION);
    this.functionKeyword = functionKeyword;
    this.starToken = starToken;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
    this.kind = Kind.GENERATOR_DECLARATION;

    addChildren(functionKeyword, starToken, name, parameters, body);
  }

  public FunctionDeclarationTreeImpl(InternalSyntaxToken functionKeyword, IdentifierTreeImpl name,
    ParameterListTreeImpl parameters, BlockTreeImpl body) {

    super(Kind.FUNCTION_DECLARATION);
    this.functionKeyword = functionKeyword;
    this.starToken = null;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
    this.kind = Kind.FUNCTION_DECLARATION;

    addChildren(functionKeyword, name, parameters, body);
  }

  @Override
  public SyntaxToken functionKeyword() {
    return functionKeyword;
  }

  @Nullable
  @Override
  public SyntaxToken starToken() {
    return starToken;
  }

  @Override
  public IdentifierTree name() {
    return name;
  }

  @Override
  public ParameterListTree parameters() {
    return parameters;
  }

  @Override
  public BlockTree body() {
    return body;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(name, parameters, body);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitFunctionDeclaration(this);
  }
}
