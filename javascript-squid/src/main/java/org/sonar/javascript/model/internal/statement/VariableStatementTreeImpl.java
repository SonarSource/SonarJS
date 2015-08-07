/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.model.internal.statement;

import com.google.common.collect.Iterators;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.statement.EndOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import java.util.Iterator;

public class VariableStatementTreeImpl extends JavaScriptTree implements VariableStatementTree {

  private final VariableDeclarationTreeImpl declaration;
  private final EndOfStatementTreeImpl eos;

  public VariableStatementTreeImpl(VariableDeclarationTreeImpl declaration, EndOfStatementTreeImpl eos) {
    this.declaration = declaration;
    this.eos = eos;
  }

  @Override
  public Kind getKind() {
    return Kind.VARIABLE_STATEMENT;
  }

  @Override
  public VariableDeclarationTreeImpl declaration() {
    return declaration;
  }

  @Override
  public EndOfStatementTree endOfStatement() {
    return eos;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(declaration, eos);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitVariableStatement(this);
  }
}
