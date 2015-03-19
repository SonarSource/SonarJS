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
import org.sonar.plugins.javascript.api.SymbolModel;
import org.sonar.javascript.ast.resolve.Symbol;
import org.sonar.javascript.ast.resolve.SymbolDeclaration;
import org.sonar.javascript.ast.resolve.Usage;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

public class HighlightSymbolTableBuilder {

  private HighlightSymbolTableBuilder() {
  }

  public static Symbolizable.SymbolTable build(Symbolizable symbolizable, SymbolModel symbolModel, SourceFileOffsets sourceFileOffsets) {
    Symbolizable.SymbolTableBuilder builder = symbolizable.newSymbolTableBuilder();

    for (Symbol symbol : symbolModel.getSymbols()) {
      InternalSyntaxToken token;
      org.sonar.api.source.Symbol reference;
      if (!symbol.builtIn()) {
        token = getSymbolNameToken(symbol);
        reference = getHighlightedSymbol(sourceFileOffsets, builder, token);
        addDeclarationReferences(sourceFileOffsets, builder, symbol, reference);
        addUsagesReferences(sourceFileOffsets, builder, symbol, reference);

      } else {

        // first usage will be used for creation of symbol, the rest will be used for references
        Set<IdentifierTree> usagesSet = getUsagesSet(symbol);

        if (!usagesSet.isEmpty()){
          List<IdentifierTree> usagesList = new LinkedList<>(usagesSet);
          token = (InternalSyntaxToken) (usagesList.get(0)).identifierToken();
          usagesList.remove(0);
          reference = getHighlightedSymbol(sourceFileOffsets, builder, token);
          addUsagesReferences(sourceFileOffsets, builder, reference, usagesList);
        }

      }

    }

    return builder.build();
  }

  private static void addUsagesReferences(
      SourceFileOffsets sourceFileOffsets,
      Symbolizable.SymbolTableBuilder builder,
      org.sonar.api.source.Symbol reference,
      List<IdentifierTree> usagesList
  ) {
    for (IdentifierTree tree : usagesList){
      builder.newReference(
          reference,
          sourceFileOffsets.startOffset(getToken(tree))
      );
    }
  }

  /**
   * @param symbol built-in symbol
   * @return set of all usage trees of symbol (including user re-declarations).
   */
  private static Set<IdentifierTree> getUsagesSet(Symbol symbol) {
    Preconditions.checkArgument(symbol.builtIn());
    Set<IdentifierTree> usagesSet = new HashSet<>();

    for (Usage usage : symbol.usages()){
      usagesSet.add(usage.symbolTree());
    }

    for (SymbolDeclaration symbolDeclaration : symbol.declarations()){
      if (symbolDeclaration.tree() instanceof IdentifierTree){
        usagesSet.add((IdentifierTree) symbolDeclaration.tree());
      }
    }
    return usagesSet;
  }

  private static org.sonar.api.source.Symbol getHighlightedSymbol(SourceFileOffsets sourceFileOffsets, Symbolizable.SymbolTableBuilder builder, InternalSyntaxToken token) {
    int startOffset = sourceFileOffsets.startOffset(token.getToken());
    int endOffset = sourceFileOffsets.endOffset(token.getToken());
    return builder.newSymbol(startOffset, endOffset);
  }

  private static void addDeclarationReferences(SourceFileOffsets sourceFileOffsets, Symbolizable.SymbolTableBuilder builder, Symbol symbol, org.sonar.api.source.Symbol reference) {
    List<SymbolDeclaration> declarations = symbol.declarations();
    for (int i = 1; i < declarations.size(); i++) {
      Tree tree = declarations.get(i).tree();
      Preconditions.checkArgument(tree instanceof IdentifierTree);
      builder.newReference(
          reference,
          sourceFileOffsets.startOffset(getToken((IdentifierTree) tree))
      );
    }
  }

  private static void addUsagesReferences(SourceFileOffsets sourceFileOffsets, Symbolizable.SymbolTableBuilder builder, Symbol symbol, org.sonar.api.source.Symbol reference) {
    List<Usage> usages = new LinkedList<>(symbol.usages());

    if (symbol.builtIn()) {
      // this usage was used for creation of symbol
      usages.remove(0);
    }

    for (Usage usage : usages) {
      if (!usage.isInitialization()) {
        builder.newReference(
            reference,
            sourceFileOffsets.startOffset(getToken(usage.symbolTree()))
        );
      }
    }
  }

  private static Token getToken(IdentifierTree identifierTree) {
    return ((InternalSyntaxToken) (identifierTree).identifierToken()).getToken();
  }

  private static InternalSyntaxToken getSymbolNameToken(Symbol symbol) {
    Preconditions.checkArgument(!symbol.builtIn());
    return (InternalSyntaxToken) ((IdentifierTree) symbol.declaration().tree()).identifierToken();
  }

}
