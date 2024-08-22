/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@DeprecatedRuleKey(ruleKey = "CommentRegularExpression")
@Rule(key = "S124")
public class CommentRegularExpressionCheck extends Check {

  private static final String DEFAULT_MESSAGE = "The regular expression matches this comment.";
  private static final String DEFAULT_REGULAR_EXPRESSION = "";
  private static final String DEFAULT_FLAGS = "";

  @RuleProperty(
    key = "regularExpression",
    description = "The regular expression (JavaScript syntax)",
    defaultValue = DEFAULT_REGULAR_EXPRESSION
  )
  public String regularExpression = DEFAULT_REGULAR_EXPRESSION;

  @RuleProperty(key = "message", description = "The issue message", defaultValue = DEFAULT_MESSAGE)
  public String message = DEFAULT_MESSAGE;

  @RuleProperty(
    key = "flags",
    description = "Regular expression modifier flags",
    defaultValue = DEFAULT_FLAGS
  )
  public String flags = DEFAULT_FLAGS;



  @Override
  public List<Object> configurations() {
    return Collections.singletonList(
      new CommentRegularExpressionCheck.Config(regularExpression, message, flags)
    );
  }

  private static class Config {

    String regularExpression;
    String message;
    String flags;

    Config(String regularExpression, String message, String flags) {
      this.regularExpression = regularExpression;
      this.message = message;
      this.flags = flags;
    }
  }
}
