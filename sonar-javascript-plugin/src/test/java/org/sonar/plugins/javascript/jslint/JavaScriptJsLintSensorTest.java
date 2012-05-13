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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.sonar.api.rules.Rule;
import org.sonar.api.rules.Violation;
import org.sonar.plugins.javascript.helpers.ViolationMatcher;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;

import static org.mockito.Matchers.argThat;
import static org.mockito.Mockito.verify;

import org.apache.commons.configuration.Configuration;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.InputFileUtils;
import org.sonar.api.resources.Language;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.rules.RuleFinder;
import org.sonar.plugins.javascript.core.JavaScript;

public class JavaScriptJsLintSensorTest {

  JavaScriptJSLintSensor sensor;
  SensorContext sensorContext;
  Configuration configuration;
  RuleFinder finder;
  JsLintRuleRepository repository;
  JsLintRuleManager rulesManager;
  JavaScriptDefaultProfile profile;
  RulesProfile qualityProfile;

  private final static String BASE_PATH = "/org/sonar/plugins/javascript/jslint/violations";

  @Before
  public void init() {
    finder = mock(RuleFinder.class);
    configuration = mock(Configuration.class);
    rulesManager = new JsLintRuleManager("/org/sonar/plugins/javascript/jslint/violations/rules.xml");
    repository = new JsLintRuleRepository(new JavaScript(null), rulesManager);
    profile = new JavaScriptDefaultProfile(repository);
    qualityProfile = profile.createProfile(null);

  }

  @Test
  public void testANON() throws Exception {
    String ruleName = "ANON";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 4)));
  }

  @Test
  public void testBITWISE() throws Exception {
    String ruleName = "BITWISE";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 4)));

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 6)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 7)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 8)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 10)));
  }

  @Test
  public void testCAP() throws Exception {
    String ruleName = "CAP";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testCONTINUE() throws Exception {
    String ruleName = "CONTINUE";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 4)));
  }

  @Test
  public void testCSS() throws Exception {
    String ruleName = "CSS";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testDEBUG() throws Exception {
    String ruleName = "DEBUG";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 4)));
  }

  @Test
  public void testEQEQ() throws Exception {
    String ruleName = "EQEQ";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 6)));
  }

  @Test
  public void testES5() throws Exception {
    String ruleName = "ES5";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 5)));
  }

  @Test
  public void testEVIL() throws Exception {
    String ruleName = "EVIL";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 4)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 5)));
  }

  @Test
  public void testFORIN() throws Exception {
    String ruleName = "FORIN";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testFRAGMENT() throws Exception {
    String ruleName = "FRAGMENT";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
  }

  @Test
  public void testMAXLEN() throws Exception {
    String ruleName = "MAXLEN";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
  }

  @Test
  public void testNEWCAP() throws Exception {
    String ruleName = "NEWCAP";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 5)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 6)));
  }

  @Test
  public void testNOMEN() throws Exception {
    String ruleName = "NOMEN";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 6)));
  }

  @Test
  public void testON() throws Exception {
    String ruleName = "ON";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testPLUSPLUS() throws Exception {
    String ruleName = "PLUSPLUS";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testPROPERTIES() throws Exception {
    String ruleName = "PROPERTIES";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 7)));
  }

  @Test
  public void testREGEXP() throws Exception {
    String ruleName = "REGEXP";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 1)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
  }

  @Test
  public void testSLOPPY() throws Exception {
    String ruleName = "SLOPPY";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
  }

  @Test
  public void testVARS() throws Exception {
    String ruleName = "VARS";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 5)));
  }

  @Test
  public void testWHITE() throws Exception {
    String ruleName = "WHITE";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 1)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 3)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 5)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 7)));
  }

  @Test
  public void testUNDEF() throws Exception {
    String ruleName = "UNDEF";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 2)));
  }

  // custom rules
  @Test
  public void testSTOPPING() throws Exception {
    String ruleName = "STOPPING";
    analyzeFile(ruleName);

    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(JsLintRuleManager.OTHER_RULES_KEY, 1)));
    verify(sensorContext).saveViolation((Violation) argThat(new ViolationMatcher(ruleName, 1)));
  }

  private void analyzeFile(String ruleName) throws IOException, URISyntaxException {
    when(finder.findByKey(JsLintRuleRepository.REPOSITORY_KEY, ruleName)).thenReturn(Rule.create(JsLintRuleRepository.REPOSITORY_KEY, ruleName));
    when(finder.findByKey(JsLintRuleRepository.REPOSITORY_KEY, JsLintRuleManager.OTHER_RULES_KEY)).thenReturn(
        Rule.create(JsLintRuleRepository.REPOSITORY_KEY, JsLintRuleManager.OTHER_RULES_KEY));

    sensor = new JavaScriptJSLintSensor(finder, new JavaScript(null), qualityProfile, rulesManager, configuration);
    sensorContext = mock(SensorContext.class);

    File fileToAnalyse = new File(getClass().getResource(BASE_PATH + "/" + ruleName + ".js").toURI());
    File baseDir = new File(getClass().getResource(BASE_PATH).toURI());

    InputFile inputFile = InputFileUtils.create(baseDir, fileToAnalyse);

    Project project = getProject(inputFile);

    sensor.analyzeFile(inputFile, project, sensorContext);
  }

  private Project getProject(InputFile inputFile) throws URISyntaxException {
    final ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    ArrayList<InputFile> inputFiles = new ArrayList<InputFile>();
    inputFiles.add(inputFile);
    when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(inputFiles);

    Project project = new Project("dummy") {

      public ProjectFileSystem getFileSystem() {
        return fileSystem;
      }

      public Language getLanguage() {
        return new JavaScript(configuration);
      }
    };

    return project;
  }
}
