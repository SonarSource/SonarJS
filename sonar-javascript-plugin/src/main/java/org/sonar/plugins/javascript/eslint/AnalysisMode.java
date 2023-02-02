/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.util.HashSet;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;

public enum AnalysisMode {
  DEFAULT, SKIP_UNCHANGED;

  static final String DEFAULT_LINTER_ID = "default";
  static final String UNCHANGED_LINTER_ID = "unchanged";
  private static final Logger LOG = Loggers.get(AnalysisMode.class);

  public static boolean isRuntimeApiCompatible(SensorContext context) {
    return context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
  }

  static AnalysisMode getMode(SensorContext context, List<EslintRule> rules) {
    var logDefaultMode = "Analysis of unchanged files will not be skipped ({})";

    if (!isRuntimeApiCompatible(context)) {
      LOG.debug(logDefaultMode, "runtime API is not compatible");
      return AnalysisMode.DEFAULT;
    }

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      LOG.debug(logDefaultMode, "current analysis requires all files to be analyzed");
      return AnalysisMode.DEFAULT;
    }

    // This is not a common use case so falling back to default behaviour even if some optimization is possible
    // (possible if all sonar-security rules are deactivated for analysis)
    var containsUcfgRule = EslintRule.containsRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
    if (!containsUcfgRule) {
      LOG.debug(logDefaultMode, "security rules are not available");
      return AnalysisMode.DEFAULT;
    }

    LOG.debug("Files which didn't change will be part of UCFG generation only, other rules will not be executed");
    return AnalysisMode.SKIP_UNCHANGED;
  }

  static List<EslintRule> getUnchangedFileRules(List<EslintRule> rules) {
    var rule = EslintRule.findFirstRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
    return rule == null ? emptyList() : List.of(rule);
  }

  static List<EslintRule> getHtmlFileRules(List<EslintRule> rules) {
    var blackListRuleKeys = new HashSet<String>();
    blackListRuleKeys.add("no-reference-error");
    blackListRuleKeys.add("no-var");
    return EslintRule.findAllBut(rules, blackListRuleKeys);
  }

  String getLinterIdFor(InputFile file) {
    if (this == SKIP_UNCHANGED && file.status() == InputFile.Status.SAME) {
      return UNCHANGED_LINTER_ID;
    } else {
      return DEFAULT_LINTER_ID;
    }
  }

}
