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
import org.sonar.javascript.ast.visitors.SubscriptionAstTreeVisitor;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.squidbridge.measures.MetricDef;

import java.util.List;
import java.util.Set;

/**
 * Visitor that computes the number of lines of code of a file.
 */
public class LinesOfCodeVisitor extends SubscriptionAstTreeVisitor {

  private final MetricDef metric;
  private Set<Integer> lines = Sets.newHashSet();

  public LinesOfCodeVisitor(MetricDef metric) {
    this.metric = metric;
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.TOKEN, Kind.SCRIPT);
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      lines.clear();
    } else {
      SyntaxToken token = (SyntaxToken) tree;
      if (!((InternalSyntaxToken)token).isEOF()) {
        lines.add(token.line());
      }
    }
  }

  @Override
  public void leaveNode(Tree tree) {
    if (tree.is(Kind.SCRIPT)) {
      getContext().getSourceCode().add(metric, lines.size());
    }
  }
}
