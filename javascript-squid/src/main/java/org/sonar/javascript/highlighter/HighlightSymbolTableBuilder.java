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

import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.SymbolModel;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static Symbolizable.SymbolTable build(Symbolizable symbolizable, SymbolModel symbolModel, SourceFileOffsets sourceFileOffsets) {
    Symbolizable.SymbolTableBuilder builder = symbolizable.newSymbolTableBuilder();

    for (Symbol symbol : symbolModel.getAllSymbols()) {
      InternalSyntaxToken token = symbol.getSymbolNameToken();

      // TODO handle built-in symbol, e.g: arguments, eval
      if (!symbol.buildIn() && token != null) {


        int startOffset = sourceFileOffsets.startOffset(token.getToken());
        int endOffset = sourceFileOffsets.endOffset(token.getToken());
        org.sonar.api.source.Symbol reference = builder.newSymbol(startOffset, endOffset);

        for (Usage usage : symbolModel.getUsageFor(symbol)) {
          if (!usage.isInit()) {
            builder.newReference(reference, sourceFileOffsets.startOffset(((InternalSyntaxToken) usage.symbolTree().identifierToken()).getToken()));
          }
        }
      }
    }

    return builder.build();
  }

}
