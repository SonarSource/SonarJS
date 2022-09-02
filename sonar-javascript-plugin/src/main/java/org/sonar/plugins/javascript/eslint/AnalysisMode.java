/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.Collections.emptyList;

enum AnalysisMode {
  DEFAULT, SKIP_UNCHANGED;

  static final String UNCHANGED_LINTER_ID = "unchanged";
  static final String DEFAULT_LINTER_ID = "default";
  private static final Logger LOG = Loggers.get(AnalysisMode.class);

  private static boolean isRuntimeApiCompatible(SensorContext context) {
    return context.runtime().getApiVersion().isGreaterThanOrEqual(Version.create(9, 4));
  }

  static AnalysisMode getModeFor(SensorContext context, List<EslintRule> rules) {
    if (!isRuntimeApiCompatible(context)) {
      LOG.debug("Won't skip unchanged files as the API is not compatible");
      return AnalysisMode.DEFAULT;
    }

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      LOG.debug("Won't skip unchanged files as this is not activated in the sensor context");
      return AnalysisMode.DEFAULT;
    }

    // This is not supposed to happen as pull request and security should both exist in the developer edition.
    var containsUcfgRule = EslintRule.containsRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
    if (!containsUcfgRule) {
      LOG.debug("Won't skip unchanged files as there's no rule with the ESLint key '{}'", EslintRule.UCFG_ESLINT_KEY);
      return AnalysisMode.DEFAULT;
    }

    LOG.debug("Files which didn't change will be part of UCFG generation only, other rules will not be executed");
    return AnalysisMode.SKIP_UNCHANGED;
  }

  List<EslintRule> getUnchangedFileRules(List<EslintRule> rules) {
    if (this == SKIP_UNCHANGED) {
      var rule = EslintRule.findFirstRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
      return rule == null ? emptyList() : List.of(rule);
    } else {
      return rules;
    }
  }

  String getLinterIdFor(InputFile file) {
    // IF we can skip unchanged files AND the file is unchanged THEN we can use the unchanged linter.
    if (this == SKIP_UNCHANGED && file.status() == InputFile.Status.SAME) {
      return UNCHANGED_LINTER_ID;
    } else {
      return DEFAULT_LINTER_ID;
    }
  }

}
