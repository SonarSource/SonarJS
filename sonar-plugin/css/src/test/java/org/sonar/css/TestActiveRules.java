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
package org.sonar.css;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.annotation.CheckForNull;
import org.sonar.api.batch.rule.ActiveRule;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.issue.impact.Severity;
import org.sonar.api.issue.impact.SoftwareQuality;
import org.sonar.api.rule.RuleKey;

public class TestActiveRules implements ActiveRules {

  private final List<ActiveRule> activeRules;

  public TestActiveRules(String... activeRules) {
    this.activeRules =
      Arrays.stream(activeRules).map(TestActiveRule::new).collect(Collectors.toList());
  }

  @CheckForNull
  @Override
  public ActiveRule find(RuleKey ruleKey) {
    return null;
  }

  @Override
  public Collection<ActiveRule> findAll() {
    return activeRules;
  }

  @Override
  public Collection<ActiveRule> findByRepository(String repository) {
    return activeRules;
  }

  @Override
  public Collection<ActiveRule> findByLanguage(String language) {
    return activeRules;
  }

  @CheckForNull
  @Override
  public ActiveRule findByInternalKey(String repository, String internalKey) {
    return null;
  }

  static class TestActiveRule implements ActiveRule {

    final RuleKey ruleKey;

    public TestActiveRule(String key) {
      ruleKey = RuleKey.of(CssRulesDefinition.REPOSITORY_KEY, key);
    }

    @Override
    public RuleKey ruleKey() {
      return ruleKey;
    }

    @Override
    public String severity() {
      return null;
    }

    @Override
    public String language() {
      return null;
    }

    @CheckForNull
    @Override
    public String param(String key) {
      return null;
    }

    @Override
    public Map<String, String> params() {
      return Collections.emptyMap();
    }

    @CheckForNull
    @Override
    public String internalKey() {
      return null;
    }

    @CheckForNull
    @Override
    public String templateRuleKey() {
      return null;
    }

    @Override
    public String qpKey() {
      return null;
    }
  }
}
