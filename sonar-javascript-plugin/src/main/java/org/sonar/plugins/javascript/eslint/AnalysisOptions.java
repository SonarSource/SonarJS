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
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;

import static java.util.stream.Collectors.toList;

class AnalysisOptions {

  static final String UNCHANGED_LINTER_ID = "unchanged";
  static final String DEFAULT_LINTER_ID = "default";
  private static final Logger LOG = Loggers.get(AnalysisOptions.class);

  private final Consumer<BiConsumer<SensorContext, List<EslintRule>>> initializer;
  private boolean initialized = false;
  private boolean skipUnchangedFiles;
  private List<EslintRule> unchangedFileRules;

  AnalysisOptions(SensorContext context, List<EslintRule> rules) {
    this(fn -> fn.accept(context, rules));
  }

  AnalysisOptions(Consumer<BiConsumer<SensorContext, List<EslintRule>>> initializer) {
    this.initializer = initializer;
  }

  private void initializeIfNeeded() {
    if (!initialized) {
      initializer.accept(this::initialize);
    }
  }

  private void initialize(SensorContext context, List<EslintRule> rules) {
    var canSkipUnchangedFiles = context.canSkipUnchangedFiles();
    if (!canSkipUnchangedFiles) {
      LOG.info("Won't skip unchanged files as this is not activated in the sensor contextUtils");
      setInitialized(false, List.of());
      return;
    }

    var containsUcfgRule = EslintRule.containsRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY);
    if (!containsUcfgRule) {
      LOG.info("Won't skip unchanged files as there's no rule with the ESLint key '{}'", EslintRule.UCFG_ESLINT_KEY);
      setInitialized(true, List.of());
      return;
    }

    LOG.info("Will skip unchanged files");
    setInitialized(true, EslintRule.findFirstRuleWithKey(rules, EslintRule.UCFG_ESLINT_KEY));
  }

  private void setInitialized(boolean skipUnchangedFiles, List<EslintRule> unchangedFileRules) {
    this.skipUnchangedFiles = skipUnchangedFiles;
    this.unchangedFileRules = unchangedFileRules;
    initialized = true;
  }

  boolean isUnchangedAnalysisEnabled() {
    initializeIfNeeded();
    return skipUnchangedFiles && !unchangedFileRules.isEmpty();
  }

  List<EslintRule> getUnchangedFileRules() {
    initializeIfNeeded();
    return unchangedFileRules;
  }

  List<InputFile> getFilesToAnalyzeIn(List<InputFile> inputFiles) {
    initializeIfNeeded();
    // IF we can skip unchanged files AND there's no rule for unchanged files THEN we can analyse only changed files.
    if (skipUnchangedFiles && unchangedFileRules.isEmpty()) {
      return inputFiles.stream().filter(inputFile -> inputFile.status() == InputFile.Status.CHANGED).collect(toList());
    } else {
      return inputFiles;
    }
  }

  String getLinterIdFor(InputFile file) {
    initializeIfNeeded();
    // IF we can skip unchanged files AND the file is unchanged THEN we can use the unchanged linter.
    if (skipUnchangedFiles && file.status() == InputFile.Status.SAME) {
      return UNCHANGED_LINTER_ID;
    } else {
      return DEFAULT_LINTER_ID;
    }
  }

}
