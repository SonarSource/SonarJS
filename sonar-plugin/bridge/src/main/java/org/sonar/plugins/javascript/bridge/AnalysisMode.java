/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge;

import static java.util.Collections.emptyList;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.sensor.SensorContext;

public enum AnalysisMode {
  DEFAULT,
  SKIP_UNCHANGED;

  public static final String DEFAULT_LINTER_ID = "default";
  public static final String UNCHANGED_LINTER_ID = "unchanged";
  private static final Logger LOG = LoggerFactory.getLogger(AnalysisMode.class);


  public static AnalysisMode getMode(SensorContext context) {
    var logDefaultMode = "Analysis of unchanged files will not be skipped ({})";

    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      LOG.debug(logDefaultMode, "current analysis requires all files to be analyzed");
      return AnalysisMode.DEFAULT;
    }

    // This is not a common use case so falling back to default behaviour even if some optimization is possible
    // (possible if all sonar-security rules are deactivated for analysis)
    // This is used to avoid creating instance of "unchaged" linter when not needed. However, linter id mechanism should be replaced by using
    // configuration instead, same as we do for MAIN and TEST files
    if (!hasSecurityRules(context.activeRules())) {
      LOG.debug(logDefaultMode, "security rules are not available");
      return AnalysisMode.DEFAULT;
    }

    LOG.debug(
      "Files which didn't change will be part of UCFG generation only, other rules will not be executed"
    );
    return AnalysisMode.SKIP_UNCHANGED;
  }

  private static boolean hasSecurityRules(ActiveRules activeRules) {
    return Stream.of("jssecurity", "tssecurity").anyMatch(r -> !activeRules.findByRepository(r).isEmpty());
  }

  public static List<EslintRule> getUnchangedFileRules(List<EslintRule> rules) {
    var rule = EslintRule.findFirstRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
    return rule == null ? emptyList() : List.of(rule);
  }

  /**
   * Disable rules that are too noisy in HTML files
   * Only add rules part of the "Sonar Way" profile
   *
   * @param rules
   * @return
   */
  public static List<EslintRule> getHtmlFileRules(List<EslintRule> rules) {
    var blackListRuleKeys = new HashSet<String>();
    blackListRuleKeys.add("S3504");
    blackListRuleKeys.add("ucfg");
    return EslintRule.findAllBut(rules, blackListRuleKeys);
  }

  public String getLinterIdFor(InputFile file) {
    if (this == SKIP_UNCHANGED && file.status() == InputFile.Status.SAME) {
      return UNCHANGED_LINTER_ID;
    } else {
      return DEFAULT_LINTER_ID;
    }
  }
}
