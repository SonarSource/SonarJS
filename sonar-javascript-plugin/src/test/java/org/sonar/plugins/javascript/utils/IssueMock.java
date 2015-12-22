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

import java.util.Date;
import java.util.List;
import java.util.Map;
import org.sonar.api.issue.Issue;
import org.sonar.api.issue.IssueComment;
import org.sonar.api.rule.RuleKey;

public class IssueMock implements Issue {

  private RuleKey ruleKey = null;
  private String message = null;
  private Integer line = null;
  private Double effortToFix = null;

  public void setRuleKey(RuleKey ruleKey) {
    this.ruleKey = ruleKey;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public void setLine(Integer line) {
    this.line = line;
  }

  public void setEffortToFix(Double effortToFix) {
    this.effortToFix = effortToFix;
  }

  @Override
  public String key() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String componentKey() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public RuleKey ruleKey() {
    return ruleKey;
  }

  @Override
  public String severity() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String message() {
    return message;
  }

  @Override
  public Integer line() {
    return line;
  }

  @Override
  public Double effortToFix() {
    return effortToFix;
  }

  @Override
  public String status() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String resolution() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String reporter() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String assignee() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Date creationDate() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Date updateDate() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Date closeDate() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String attribute(String key) {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public Map<String, String> attributes() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String authorLogin() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public String actionPlanKey() {
    throw new UnsupportedOperationException("This method is not implemented");
  }

  @Override
  public List<IssueComment> comments() {
    return null;
  }

  @Override
  public boolean isNew() {
    return false;
  }

}
