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
package org.sonar.javascript.metrics;


import com.google.common.collect.ImmutableList;
import com.google.common.collect.Sets;
import org.sonar.javascript.EcmaScriptCommentAnalyser;
import org.sonar.javascript.ast.visitors.SubscriptionAstTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import java.util.List;
import java.util.Set;

public class CommentLineVisitor extends SubscriptionAstTreeVisitor {

  private Set<Integer> comments = Sets.newHashSet();
  private Set<Integer> noSonarLines = Sets.newHashSet();
  private boolean seenFirstToken;
  private boolean ignoreHeaderComments;
  private EcmaScriptCommentAnalyser commentAnalyser = new EcmaScriptCommentAnalyser();

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Tree.Kind.TOKEN);
  }

  public CommentLineVisitor(Tree tree, boolean ignoreHeaderComments) {
    this.ignoreHeaderComments = ignoreHeaderComments;

    this.comments.clear();
    this.noSonarLines.clear();
    this.seenFirstToken = false;
    scanTree(tree);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.TOKEN)) {
      for (SyntaxTrivia trivia : ((SyntaxToken) tree).trivias()) {
        if ((ignoreHeaderComments && seenFirstToken) || !ignoreHeaderComments) {
          String[] commentLines = commentAnalyser.getContents(trivia.comment())
              .split("(\r)?\n|\r", -1);
          int line = trivia.startLine();
          for (String commentLine : commentLines) {
            if (commentLine.contains("NOSONAR")) {
              noSonarLines.add(line);
            }
            if (!commentAnalyser.isBlank(commentLine)) {
              comments.add(line);
            }
            line++;
          }
        } else {
          seenFirstToken = true;
        }
      }
      seenFirstToken = true;
    }
  }

  public Set<Integer> noSonarLines() {
    return noSonarLines;
  }

  public Set<Integer> getCommentLines() {
    return comments;
  }

  public int getCommentLineNumber() {
    return comments.size();
  }
}
