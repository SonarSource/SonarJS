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
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S139")
@DeprecatedRuleKey(ruleKey = "TrailingComment")
public class TrailingCommentCheck implements EslintBasedCheck {

  private static final String DEFAULT_LEGAL_COMMENT_PATTERN = "^\\s*[^\\s]+$";

  @RuleProperty(
    key = "pattern",
    description = "Pattern (JavaScript syntax) for text of trailing comments that are allowed.",
    defaultValue = DEFAULT_LEGAL_COMMENT_PATTERN
  )
  String legalCommentPattern = DEFAULT_LEGAL_COMMENT_PATTERN;

  @Override
  public String eslintKey() {
    return "line-comment-position";
  }

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(legalCommentPattern));
  }

  private static class Config {

    String ignorePattern;

    Config(String ignorePattern) {
      this.ignorePattern = ignorePattern;
    }
  }
}
