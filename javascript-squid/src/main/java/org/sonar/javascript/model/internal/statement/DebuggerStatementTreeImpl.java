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
package org.sonar.javascript.model.internal.statement;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.DebuggerStatementTree;

import java.util.Iterator;

public class DebuggerStatementTreeImpl extends JavaScriptTree implements DebuggerStatementTree {

  private final SyntaxToken debuggerKeyword;

  public DebuggerStatementTreeImpl(InternalSyntaxToken debuggerKeyword, AstNode eos) {
    super(Kind.DEBUGGER_STATEMENT);
    this.debuggerKeyword = debuggerKeyword;

    addChild(debuggerKeyword);
    addChild(eos);
  }

  @Override
  public Kind getKind() {
    return Kind.DEBUGGER_STATEMENT;
  }

  @Override
  public SyntaxToken debuggerKeyword() {
    return debuggerKeyword;
  }

  @Override
  public Tree endOfStatement() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitDebugger(this);
  }
}
