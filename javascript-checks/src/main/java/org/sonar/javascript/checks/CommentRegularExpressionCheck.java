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
package org.sonar.javascript.checks;

import com.google.common.base.Strings;
import com.google.common.collect.ImmutableList;
import java.util.List;
import java.util.regex.Pattern;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.squidbridge.annotations.NoSqale;
import org.sonar.squidbridge.annotations.RuleTemplate;

import static com.google.common.base.Preconditions.checkNotNull;

@Rule(
  key = "CommentRegularExpression",
  name = "Regular expression on comment",
  priority = Priority.MAJOR)
@RuleTemplate
@NoSqale
public class CommentRegularExpressionCheck extends SubscriptionBaseTreeVisitor {

  private static final String DEFAULT_MESSAGE = "The regular expression matches this comment.";
  private static final String DEFAULT_REGULAR_EXPRESSION = "";

  @RuleProperty(
    key = "regularExpression",
    description = "The regular expression",
    defaultValue = "" + DEFAULT_REGULAR_EXPRESSION)
  private String regularExpression = DEFAULT_REGULAR_EXPRESSION;

  @RuleProperty(
    key = "message",
    description = "The issue message",
    defaultValue = "" + DEFAULT_MESSAGE)
  private String message = DEFAULT_MESSAGE;

  private Pattern pattern = null;

  public void init() {
    checkNotNull(regularExpression, "getRegularExpression() should not return null");

    if (!Strings.isNullOrEmpty(regularExpression)) {
      try {
        pattern = Pattern.compile(regularExpression, Pattern.DOTALL);
      } catch (RuntimeException e) {
        throw new IllegalStateException("Unable to compile regular expression: " + regularExpression, e);
      }

    } else {
      pattern = null;
    }
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public void setRegularExpression(String regularExpression) {
    this.regularExpression = regularExpression;
    init();
  }

  @Override
  public void visitNode(Tree tree) {
    if (pattern != null) {
      SyntaxToken token = (SyntaxToken) tree;
      for (SyntaxTrivia trivia : token.trivias()) {
        if (pattern.matcher(trivia.text()).matches()) {
          getContext().addIssue(this, trivia.line(), message);
        }
      }
    }
  }

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.TOKEN);
  }
}
