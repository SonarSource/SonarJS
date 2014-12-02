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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;

import java.util.Iterator;
import java.util.List;

public class VariableStatementTreeImpl extends JavaScriptTree implements VariableStatementTree {

  private SyntaxToken varKeyword;
  private final SeparatedList<VariableDeclarationTreeImpl> declarations;

  public VariableStatementTreeImpl(List<VariableDeclarationTreeImpl> declarations, List<InternalSyntaxToken> commas, List<AstNode> children) {
    super(Kind.VARIABLE_STATEMENT);
    Preconditions.checkArgument(commas.size() == declarations.size() - 1, "Variable declaration cannot be null");
    this.declarations = new SeparatedList<VariableDeclarationTreeImpl>(declarations, commas);

    for (AstNode child : children) {
      addChild(child);
    }
  }

  public VariableStatementTreeImpl complete(InternalSyntaxToken varKeyword, AstNode eos) {
    Preconditions.checkState(this.varKeyword == null, "Already complete");
    this.varKeyword = varKeyword;

    prependChildren(varKeyword);
    addChild(eos);
    return this;
  }

  @Override
  public Kind getKind() {
    return Kind.VARIABLE_STATEMENT;
  }

  @Override
  public SyntaxToken varKeyword() {
    return varKeyword;
  }

  @Override
  public SeparatedList<VariableDeclarationTreeImpl> declarations() {
    return declarations;
  }

  @Override
  public Tree endOfStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(declarations.toArray(new Tree[declarations.size()]));
  }
}
