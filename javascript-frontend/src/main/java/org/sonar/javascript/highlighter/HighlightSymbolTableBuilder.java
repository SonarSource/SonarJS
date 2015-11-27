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
package org.sonar.javascript.highlighter;

import java.util.LinkedList;
import java.util.List;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static Symbolizable.SymbolTable build(Symbolizable symbolizable, SymbolModel symbolModel) {
    Symbolizable.SymbolTableBuilder builder = symbolizable.newSymbolTableBuilder();

    for (Symbol symbol : symbolModel.getSymbols()) {
      if (!symbol.usages().isEmpty()) {
        List<Usage> usagesList = new LinkedList<>(symbol.usages());
        InternalSyntaxToken token = (InternalSyntaxToken) (usagesList.get(0).identifierTree()).identifierToken();
        org.sonar.api.source.Symbol reference = getHighlightedSymbol(builder, token);
        for (int i = 1; i < usagesList.size(); i++) {
          builder.newReference(
            reference,
            getToken(usagesList.get(i).identifierTree()).startIndex()
          );
        }

      }
    }

    return builder.build();
  }

  private static org.sonar.api.source.Symbol getHighlightedSymbol(Symbolizable.SymbolTableBuilder builder, InternalSyntaxToken token) {
    int startOffset = token.startIndex();
    int endOffset = token.toIndex();
    return builder.newSymbol(startOffset, endOffset);
  }

  private static InternalSyntaxToken getToken(IdentifierTree identifierTree) {
    return (InternalSyntaxToken) (identifierTree).identifierToken();
  }
}
