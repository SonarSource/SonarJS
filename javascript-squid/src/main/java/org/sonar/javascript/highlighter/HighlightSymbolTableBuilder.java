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
package org.sonar.javascript.highlighter;

import com.google.common.base.Preconditions;
import com.sonar.sslr.api.Token;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.SymbolDeclaration;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import javax.annotation.Nullable;
import java.util.List;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static Symbolizable.SymbolTable build(Symbolizable symbolizable, SymbolModel symbolModel, SourceFileOffsets sourceFileOffsets) {
    Symbolizable.SymbolTableBuilder builder = symbolizable.newSymbolTableBuilder();

    for (Symbol symbol : symbolModel.getSymbols()) {
      InternalSyntaxToken token = getSymbolNameToken(symbol);

      // TODO handle built-in symbol, e.g: arguments, eval
      if (!symbol.builtIn() && token != null) {

        int startOffset = sourceFileOffsets.startOffset(token.getToken());
        int endOffset = sourceFileOffsets.endOffset(token.getToken());
        org.sonar.api.source.Symbol reference = builder.newSymbol(startOffset, endOffset);

        addDeclarationReferences(sourceFileOffsets, builder, symbol, reference);
        addUsagesReferences(sourceFileOffsets, builder, symbol, reference);

      }
    }

    return builder.build();
  }

  private static void addDeclarationReferences(SourceFileOffsets sourceFileOffsets, Symbolizable.SymbolTableBuilder builder, Symbol symbol, org.sonar.api.source.Symbol reference) {
    List<SymbolDeclaration> declarations = symbol.declarations();
    for (int i = 1; i < declarations.size(); i++){
      Tree tree = declarations.get(i).tree();
      Preconditions.checkArgument(tree instanceof IdentifierTree);
      builder.newReference(
          reference,
          sourceFileOffsets.startOffset(getToken((IdentifierTree) tree))
      );
    }
  }

  private static void addUsagesReferences(SourceFileOffsets sourceFileOffsets, Symbolizable.SymbolTableBuilder builder, Symbol symbol, org.sonar.api.source.Symbol reference) {
    for (Usage usage : symbol.usages()) {
      if (!usage.isInitialization()) {
        builder.newReference(
            reference,
            sourceFileOffsets.startOffset(getToken(usage.symbolTree()))
        );
      }
    }
  }

  private static Token getToken(IdentifierTree identifierTree){
    return ((InternalSyntaxToken) (identifierTree).identifierToken()).getToken();
  }

  @Nullable
  private static InternalSyntaxToken getSymbolNameToken(Symbol symbol) {
    if (symbol.builtIn()){
      return null;
    } else {
      return (InternalSyntaxToken) ((IdentifierTree) symbol.declaration().tree()).identifierToken();
    }
  }

}
