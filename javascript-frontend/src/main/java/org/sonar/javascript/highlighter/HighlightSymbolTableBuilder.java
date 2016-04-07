/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.api.source.Symbolizable;
import org.sonar.api.source.Symbolizable.SymbolTableBuilder;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.ClassType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static Symbolizable.SymbolTable build(Symbolizable symbolizable, SymbolModel symbolModel) {
    Symbolizable.SymbolTableBuilder builder = symbolizable.newSymbolTableBuilder();
    Set<ClassType> classTypes = new HashSet<>();

    for (Symbol symbol : symbolModel.getSymbols()) {
      highlightSymbol(builder, symbol);

      if (symbol.kind() == Symbol.Kind.CLASS) {
        Type classType = symbol.types().getUniqueType(Kind.CLASS);
        if (classType != null) {
          classTypes.add((ClassType) classType);
        }
      }
    }

    for (ClassType classType : classTypes) {
      for (Symbol symbol : classType.properties()) {
        highlightSymbol(builder, symbol);
      }
    }

    return builder.build();
  }

  private static void highlightSymbol(SymbolTableBuilder builder, Symbol symbol) {
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

  private static org.sonar.api.source.Symbol getHighlightedSymbol(Symbolizable.SymbolTableBuilder builder, InternalSyntaxToken token) {
    int startOffset = token.startIndex();
    int endOffset = token.toIndex();
    return builder.newSymbol(startOffset, endOffset);
  }

  private static InternalSyntaxToken getToken(IdentifierTree identifierTree) {
    return (InternalSyntaxToken) (identifierTree).identifierToken();
  }
}
