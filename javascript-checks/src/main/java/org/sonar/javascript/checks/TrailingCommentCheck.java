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
package org.sonar.javascript.checks;

import com.google.common.collect.ImmutableList;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.util.List;
import java.util.regex.Pattern;

@Rule(
  key = "TrailingComment",
  name = "Comments should not be located at the end of lines of code",
  priority = Priority.INFO,
  tags = {Tags.CONVENTION})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class TrailingCommentCheck extends SubscriptionBaseTreeVisitor {

  private static final String DEFAULT_LEGAL_COMMENT_PATTERN = "^//\\s*+[^\\s]++$";

  @RuleProperty(
    key = "legalCommentPattern",
    description = "Pattern for text of trailing comments that are allowed.",
    defaultValue = DEFAULT_LEGAL_COMMENT_PATTERN)
  private String legalCommentPattern = DEFAULT_LEGAL_COMMENT_PATTERN;

  private Pattern pattern;
  private int previousTokenLine;

  @Override
  public List<Tree.Kind> nodesToVisit() {
    return ImmutableList.of(Tree.Kind.TOKEN);
  }

  @Override
  public void visitFile(Tree tree) {
    previousTokenLine = -1;
    pattern = Pattern.compile(legalCommentPattern);
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken token = (SyntaxToken) tree;
    for (SyntaxTrivia trivia : token.trivias()) {
      if (trivia.line() == previousTokenLine) {
        String comment = trivia.text();
        if (comment.startsWith("//") && !pattern.matcher(comment).matches()) {
          getContext().addIssue(this, previousTokenLine, "Move this trailing comment on the previous empty line.");
        }
      }
    }
    previousTokenLine = token.line();
  }

  public void setLegalCommentPattern(String pattern) {
    this.legalCommentPattern = pattern;
  }

}
