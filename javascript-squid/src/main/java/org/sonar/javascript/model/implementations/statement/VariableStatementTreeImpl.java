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
package org.sonar.javascript.model.implementations.statement;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;

import java.util.Iterator;
import java.util.List;

public class VariableStatementTreeImpl extends JavaScriptTree implements VariableStatementTree {

  private final Kind kind;
  private final InternalSyntaxToken token;
  private final SeparatedList<BindingElementTree> variables;

  public VariableStatementTreeImpl(Kind kind, InternalSyntaxToken token, SeparatedList<BindingElementTree> variables, List<AstNode> children, AstNode eos) {
    super(kind);

    this.kind = kind;
    this.token = token;
    this.variables = variables;

    addChild(token);
    for (AstNode child : children) {
      addChild(child);
    }
    addChild(eos);
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public SyntaxToken varKeyword() {
    return token;
  }

  @Override
  public SeparatedList<BindingElementTree> variables() {
    return variables;
  }

  @Override
  public Tree endOfStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(variables.toArray(new Tree[variables.size()]));
  }

}
