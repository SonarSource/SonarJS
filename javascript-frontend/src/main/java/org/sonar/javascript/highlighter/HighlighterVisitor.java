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

import com.google.common.collect.ImmutableList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.source.Highlightable;
import org.sonar.api.source.Highlightable.HighlightingBuilder;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.tree.visitors.SubscriptionAstTreeVisitor;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import javax.annotation.Nullable;
import java.io.File;
import java.util.List;

public class HighlighterVisitor extends SubscriptionAstTreeVisitor {

  private final ResourcePerspectives resourcePerspectives;
  private final FileSystem fileSystem;
  private HighlightingBuilder highlighting;
  private SourceFileOffsets offsets;

  private static final Logger LOG = LoggerFactory.getLogger(HighlighterVisitor.class);

  public HighlighterVisitor(ResourcePerspectives resourcePerspectives, FileSystem fileSystem) {
    this.resourcePerspectives = resourcePerspectives;
    this.fileSystem = fileSystem;
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
        Kind.NUMERIC_LITERAL,
        Kind.STRING_LITERAL,
        Kind.TOKEN
    );
  }

  @Override
  public void scanFile(TreeVisitorContext context) {
    highlighting = initHighlighting(context.getFile());
    if (highlighting != null) {
      super.scanFile(context);
      stopHighlighting();
    }
  }

  private void stopHighlighting() {
    highlighting.done();
  }

  @Override
  public void visitNode(Tree tree) {
    switch (((JavaScriptTree) tree).getKind()) {
      case TOKEN:
        highlightToken((InternalSyntaxToken) tree);
        break;
      case STRING_LITERAL:
        SyntaxToken token = ((LiteralTreeImpl) tree).token();
        highlight(offsets.startOffset(token), offsets.endOffset(token), "s");
        break;
      case NUMERIC_LITERAL:
        token = ((LiteralTreeImpl) tree).token();
        highlight(offsets.startOffset(token), offsets.endOffset(token), "c");
        break;
      default:
        throw new IllegalStateException("Unexpected tree kind in HighlighterVisitor");
    }
  }

  private void highlightToken(InternalSyntaxToken token) {
    if (isKeyword(token.text())) {
      highlight(offsets.startOffset(token), offsets.endOffset(token), "k");
    }
    highlightComments(token);
  }

  private void highlightComments(InternalSyntaxToken token) {
    String code;
    if (!token.trivias().isEmpty()) {
      for (SyntaxTrivia trivia : token.trivias()) {
        if (trivia.text().startsWith("/**")) {
          code = "j";
        } else {
          code = "cd";
        }
        highlight(offsets.startOffset(trivia), offsets.endOffset(trivia), code);
      }
    }
  }

  @Nullable
  private HighlightingBuilder initHighlighting(File file) {
    InputFile inputFile = fileSystem.inputFile(fileSystem.predicates().is(file));
    if (inputFile == null) {
      throw new IllegalArgumentException("Cannot get " + Highlightable.class.getCanonicalName() + " for a null file");
    }
    Highlightable highlightable = resourcePerspectives.as(Highlightable.class, inputFile);
    if (highlightable == null) {
      LOG.warn("Could not get " + Highlightable.class.getCanonicalName() + " for " + inputFile.file());
      return null;
    } else {
      highlighting = highlightable.newHighlighting();
      offsets = new SourceFileOffsets(file, fileSystem.encoding());
      return this.highlighting;
    }
  }

  private void highlight(int startOffset, int endOffset, String code) {
    if (endOffset > startOffset) {
      highlighting.highlight(startOffset, endOffset, code);
    }
  }

  private static boolean isKeyword(String text) {
    for (String keyword : JavaScriptKeyword.keywordValues()) {
      if (keyword.equals(text)) {
        return true;
      }
    }
    return false;
  }

}
