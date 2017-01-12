/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.highlighter;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import org.sonar.api.batch.sensor.symbol.NewSymbol;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.javascript.tree.symbols.type.ClassType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.TemplateExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxJavaScriptExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static void build(NewSymbolTable newSymbolTable, TreeVisitorContext context) {
    Set<ClassType> classTypes = new HashSet<>();

    for (Symbol symbol : context.getSymbolModel().getSymbols()) {
      highlightSymbol(newSymbolTable, symbol);
      if (symbol.kind() == Symbol.Kind.CLASS) {
        Type classType = symbol.types().getUniqueType(Kind.CLASS);
        if (classType != null) {
          classTypes.add((ClassType) classType);
        }
      }
    }

    for (ClassType classType : classTypes) {
      for (Symbol symbol : classType.properties()) {
        highlightSymbol(newSymbolTable, symbol);
      }
    }

    (new BracesVisitor(newSymbolTable)).scanTree(context);
    newSymbolTable.save();
  }

  private static void highlightSymbol(NewSymbolTable newSymbolTable, Symbol symbol) {
    if (!symbol.usages().isEmpty()) {
      List<Usage> usagesList = new LinkedList<>(symbol.usages());
      SyntaxToken token = (usagesList.get(0).identifierTree()).identifierToken();
      NewSymbol newSymbol = getHighlightedSymbol(newSymbolTable, token);
      for (int i = 1; i < usagesList.size(); i++) {
        SyntaxToken referenceToken = getToken(usagesList.get(i).identifierTree());
        addReference(newSymbol, referenceToken);
      }

    }
  }

  private static void addReference(NewSymbol symbol, SyntaxToken referenceToken) {
    symbol.newReference(referenceToken.line(), referenceToken.column(), referenceToken.line(), referenceToken.column() + referenceToken.text().length());
  }

  private static NewSymbol getHighlightedSymbol(NewSymbolTable newSymbolTable, SyntaxToken token) {
    return newSymbolTable.newSymbol(token.line(), token.column(), token.line(), token.column() + token.text().length());
  }

  private static SyntaxToken getToken(IdentifierTree identifierTree) {
    return (identifierTree).identifierToken();
  }

  private static class BracesVisitor extends DoubleDispatchVisitor {

    private final NewSymbolTable newSymbolTable;

    BracesVisitor(NewSymbolTable newSymbolTable) {
      this.newSymbolTable = newSymbolTable;
    }

    @Override
    public void visitBlock(BlockTree tree) {
      highlightBraces(tree.openCurlyBrace(), tree.closeCurlyBrace());
      super.visitBlock(tree);
    }

    @Override
    public void visitObjectLiteral(ObjectLiteralTree tree) {
      highlightBraces(tree.openCurlyBrace(), tree.closeCurlyBrace());
      super.visitObjectLiteral(tree);
    }

    @Override
    public void visitClass(ClassTree tree) {
      highlightBraces(tree.openCurlyBraceToken(), tree.closeCurlyBraceToken());
      super.visitClass(tree);
    }

    @Override
    public void visitTemplateExpression(TemplateExpressionTree tree) {
      highlightBraces(tree.openCurlyBrace(), tree.closeCurlyBrace());
      super.visitTemplateExpression(tree);
    }

    @Override
    public void visitSpecifierList(SpecifierListTree tree) {
      highlightBraces(tree.openCurlyBraceToken(), tree.closeCurlyBraceToken());
      super.visitSpecifierList(tree);
    }

    @Override
    public void visitObjectBindingPattern(ObjectBindingPatternTree tree) {
      highlightBraces(tree.openCurlyBrace(), tree.closeCurlyBrace());
      super.visitObjectBindingPattern(tree);
    }

    @Override
    public void visitJsxSpreadAttribute(JsxSpreadAttributeTree tree) {
      highlightBraces(tree.lCurlyBraceToken(), tree.rCurlyBraceToken());
      super.visitJsxSpreadAttribute(tree);
    }

    @Override
    public void visitJsxJavaScriptExpression(JsxJavaScriptExpressionTree tree) {
      highlightBraces(tree.lCurlyBraceToken(), tree.rCurlyBraceToken());
      super.visitJsxJavaScriptExpression(tree);
    }

    @Override
    public void visitSwitchStatement(SwitchStatementTree tree) {
      highlightBraces(tree.openCurlyBrace(), tree.closeCurlyBrace());
      super.visitSwitchStatement(tree);
    }

    private void highlightBraces(SyntaxToken left, SyntaxToken right) {
      NewSymbol symbol = getHighlightedSymbol(newSymbolTable, left);
      addReference(symbol, right);
    }
  }
}
