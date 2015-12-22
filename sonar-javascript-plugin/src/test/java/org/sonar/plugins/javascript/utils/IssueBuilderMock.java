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
package org.sonar.plugins.javascript.utils;

import javax.annotation.Nullable;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;
import org.sonar.api.rule.RuleKey;

public class IssueBuilderMock implements Issuable.IssueBuilder {


  private IssueMock issue = new IssueMock();

  @Override
  public Issuable.IssueBuilder ruleKey(RuleKey ruleKey) {
    this.issue.setRuleKey(ruleKey);
    return this;
  }

  @Override
  public Issuable.IssueBuilder line(@Nullable Integer line) {
    issue.setLine(line);
    return this;
  }

  @Override
  public Issuable.IssueBuilder message(@Nullable String message) {
    issue.setMessage(message);
    return this;
  }

  @Override
  public Issuable.IssueBuilder severity(@Nullable String severity) {
    return this;
  }

  @Override
  public Issuable.IssueBuilder reporter(@Nullable String reporter) {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Issuable.IssueBuilder effortToFix(@Nullable Double d) {
    issue.setEffortToFix(d);
    return this;
  }

  @Override
  public Issuable.IssueBuilder attribute(String key, @Nullable String value) {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Issue build() {
    return issue;
  }

}
