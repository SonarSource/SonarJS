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
package org.sonar.javascript.ast.visitors;

import java.util.List;

import javax.annotation.Nullable;

import org.sonar.javascript.JavaScriptFileScanner;
import org.sonar.javascript.ast.resolve.SymbolModel;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

public class VisitorsBridge extends SquidAstVisitor<LexerlessGrammar> {

  private final List<JavaScriptFileScanner> scanners;

  public VisitorsBridge(List<JavaScriptFileScanner> visitors) {
    this.scanners = visitors;
  }

  @Override
  public void visitFile(@Nullable AstNode astNode) {
    if (astNode != null) {
      ScriptTree tree = (ScriptTree) astNode;

      for (JavaScriptFileScanner scanner : scanners) {
        scanner.scanFile(new AstTreeVisitorContextImpl(
          tree,
          (SourceFile) getContext().peekSourceCode(),
          getContext().getFile(),
          SymbolModel.createFor(tree)));
      }
    }
  }

}
