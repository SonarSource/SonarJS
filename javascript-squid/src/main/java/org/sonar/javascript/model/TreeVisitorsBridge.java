/*
 * Sonar JavaScript Plugin
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
package org.sonar.javascript.model;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.squid.SquidAstVisitor;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.List;

public final class TreeVisitorsBridge extends SquidAstVisitor<LexerlessGrammar> {

  private final VisitorsDispatcher visitorsDispatcher;
  private final ASTMaker astMaker;

  public TreeVisitorsBridge(List<? extends TreeVisitor> visitors) {
    astMaker = ASTMaker.create();
    visitorsDispatcher = new VisitorsDispatcher(visitors);
  }

  @Override
  public void visitFile(AstNode ast) {
    if (ast != null) {
      Tree tree = astMaker.makeFrom(ast);
      TreeImpl.scan(tree, visitorsDispatcher);
    }
  }

}
