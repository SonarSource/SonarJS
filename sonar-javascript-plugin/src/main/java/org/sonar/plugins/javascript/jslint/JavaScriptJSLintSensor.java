/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.jslint;

import com.googlecode.jslint4java.Issue;
import com.googlecode.jslint4java.JSIdentifier;
import com.googlecode.jslint4java.JSLint;
import com.googlecode.jslint4java.JSLintBuilder;
import com.googlecode.jslint4java.JSLintResult;
import com.googlecode.jslint4java.Option;
import org.apache.commons.configuration.Configuration;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Project;
import org.sonar.api.rules.ActiveRule;
import org.sonar.api.rules.ActiveRuleParam;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleFinder;
import org.sonar.api.rules.RuleQuery;
import org.sonar.api.rules.Violation;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.util.List;

public class JavaScriptJSLintSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptJSLintSensor.class);

  private Configuration configuration;
  private RulesProfile rulesProfile;
  private RuleFinder ruleFinder;
  private JavaScript javascript;
  private JSLint jsLint;
  private JsLintRuleManager jsLintRuleManager;

  public JavaScriptJSLintSensor(RuleFinder ruleFinder, JavaScript javascript, RulesProfile rulesProfile,
      JsLintRuleManager jsLintRuleManager, Configuration configuration) {
    this.configuration = configuration;
    this.ruleFinder = ruleFinder;
    this.javascript = javascript;
    this.rulesProfile = rulesProfile;
    this.jsLintRuleManager = jsLintRuleManager;
    this.jsLint = new JSLintBuilder().fromDefault();

    LOG.debug("Using JSLint version: {}", this.jsLint.getEdition());

    initializeJsLint();

  }

  private boolean isActivated(String ruleKey, List<ActiveRule> rules) {
    for (ActiveRule rule : rules) {
      if (ruleKey.equals(rule.getRuleKey())) {
        return true;
      }
    }
    return false;
  }

  public void analyse(Project project, SensorContext sensorContext) {
    for (InputFile inputFile : project.getFileSystem().mainFiles(JavaScript.KEY)) {
      try {
        analyzeFile(inputFile, project, sensorContext);
      } catch (Exception e) {
        LOG.error("Can not analyze the file " + inputFile.getFileBaseDir() + inputFile.getRelativePath(), e);
      }
    }
  }

  protected void analyzeFile(InputFile inputFile, Project project, SensorContext sensorContext) throws IOException {

    org.sonar.api.resources.File resource = org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project);

    Reader reader = null;
    try {
      reader = new StringReader(FileUtils.readFileToString(inputFile.getFile(), project.getFileSystem().getSourceCharset().name()));

      JSLintResult result = jsLint.lint(inputFile.getFile().getPath(), reader);

      // process issues found by JSLint
      List<Issue> issues = result.getIssues();
      for (Issue issue : issues) {

        LOG.debug("JSLint warning message {}", issue.getRaw());

        Rule rule = ruleFinder.findByKey(JsLintRuleRepository.REPOSITORY_KEY, jsLintRuleManager.getRuleIdByMessage(issue.getRaw()));

        Violation violation = Violation.create(rule, resource);

        violation.setLineId(issue.getLine());
        violation.setMessage(issue.getReason());

        sensorContext.saveViolation(violation);
      }

      // add special violation for unused names
      List<JSIdentifier> unused = result.getUnused();
      for (JSIdentifier unusedName : unused) {
        Violation violation = Violation.create(
            ruleFinder.findByKey(JsLintRuleRepository.REPOSITORY_KEY, JsLintRuleManager.UNUSED_NAMES_KEY), resource);

        violation.setLineId(unusedName.getLine());
        violation.setMessage("'" + unusedName.getName() + "' is unused");

        sensorContext.saveViolation(violation);
      }

    } finally {
      IOUtils.closeQuietly(reader);
    }

  }

  public boolean shouldExecuteOnProject(Project project) {
    return project.getLanguage().equals(javascript);
  }

  private void initializeJsLint() {
    RuleQuery query = RuleQuery.create();
    query.withRepositoryKey(JsLintRuleRepository.REPOSITORY_KEY);

    List<ActiveRule> activeRules = this.rulesProfile.getActiveRules();
    LOG.debug("Adding JSLint options. Activated rules: {}", activeRules.size());

    // set JSLint options for activated rules
    for (Option option : Option.values()) {
      // not inverse rule and activated
      if ( !jsLintRuleManager.isRuleInverse(option.name()) && isActivated(option.name(), activeRules)) {

        LOG.debug("Adding JSLint option from rule: {}", option.name());
        this.jsLint.addOption(option);

        // inverse rule and not activated
      } else if (jsLintRuleManager.isRuleInverse(option.name()) && !isActivated(option.name(), activeRules)) {

        LOG.debug("Adding JSLint option from inverse rule:  {}", option.name());
        this.jsLint.addOption(option);
      }

    }

    /*
     * order of these two functions is important as values set from project/global settings can be overwritten by rule parameters
     */
    setOptionsSpecifiedAsProjectSettings();
    setOptionsSpecifiedAsRuleParameters(activeRules);

  }

  private void setOptionsSpecifiedAsRuleParameters(List<ActiveRule> activeRules) {
    LOG.debug("Adding Options Specified As Rule Parameters");

    for (ActiveRule activeRule : activeRules) {
      for (ActiveRuleParam activeRuleParam : activeRule.getActiveRuleParams()) {

        String value = activeRuleParam.getValue();
        Option option = jsLintRuleManager.getOptionByName(activeRuleParam.getKey());

        LOG.debug("Rule: " + activeRule.getRuleKey() + ", ruleParam: " + activeRuleParam.getKey() + ", ruleParamValue: " + value);

        /*
         * Adds variable names that are predefined on project/global level
         */
        if (Option.PREDEF.equals(option)) {
          value = value + "," + getPredefinedVariablesListFromGlobal();
        }

        if (option != null && value != null) {
          LOG.debug("Adding JSLint option from rule parameter: {} with value: {}", option.name(), value);
          this.jsLint.addOption(option, value);
        }

      }
    }
  }

  private void setOptionsSpecifiedAsProjectSettings() {
    LOG.debug("Adding Options Specified As Project Settings");
    for (String fullparameterName : JavaScriptPlugin.GLOBAL_PARAMETERS) {

      String parameterName = fullparameterName.substring(fullparameterName.lastIndexOf(".") + 1);
      Option option = jsLintRuleManager.getOptionByName(parameterName);

      String value;
      if (Option.PREDEF.equals(option)) {
        value = getPredefinedVariablesListFromGlobal();
      } else {
        value = configuration.getString(fullparameterName);
      }

      LOG.debug("Project/global setting name retrieved from global parameter: {} with value {}", parameterName, value);

      if (option != null && value != null) {
        LOG.debug("Adding JSLint option from project/global settings: {} with value: {}", option, value);
        this.jsLint.addOption(option, value);
      }
    }
  }

  private String getPredefinedVariablesListFromGlobal() {
    String[] predefinedVariables = configuration.getStringArray(JavaScriptPlugin.PREDEFINED_KEY);
    return StringUtils.join(predefinedVariables, ',');
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
