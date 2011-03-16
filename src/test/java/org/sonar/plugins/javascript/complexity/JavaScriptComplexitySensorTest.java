/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

package org.sonar.plugins.javascript.complexity;

import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.argThat;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.api.rules.ActiveRule;
import org.sonar.api.rules.ActiveRuleParam;
import org.sonar.api.rules.Rule;
import org.sonar.api.test.IsMeasure;
import org.sonar.plugins.javascript.helpers.ViolationMatcher;
import org.sonar.plugins.javascript.jslint.JsLintRuleManager;

public class JavaScriptComplexitySensorTest {

  private JavaScriptComplexitySensor sensor;
  SensorContext context;

  @Before
  public void init() {

    RulesProfile rulesProfile = RulesProfile.create();

    Rule r = new Rule();
    r.setKey(JsLintRuleManager.CYCLOMATIC_COMPLEXITY_KEY);
    r.setRepositoryKey("JavaScript");

    ActiveRule rule = new ActiveRule();
    rule.setRule(r);

    ActiveRuleParam param = new ActiveRuleParam();
    param.setActiveRule(rule);
    param.setValue("5");

    List<ActiveRuleParam> paramList = new ArrayList<ActiveRuleParam>();
    paramList.add(param);

    rule.setActiveRuleParams(paramList);

    List<ActiveRule> list = new ArrayList<ActiveRule>();
    list.add(rule);

    rulesProfile.setActiveRules(list);

    sensor = new JavaScriptComplexitySensor(null, rulesProfile);
    context = mock(SensorContext.class);
  }

  @Test
  public void testComplexityMeasures() throws URISyntaxException, IOException {

    File file = new File(getClass().getResource("/org/sonar/plugins/javascript/complexity/ComplexityDistribution.js").toURI());

    ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    sensor.analyzeFile(file, fileSystem, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.COMPLEXITY), eq(35.0));
    verify(context).saveMeasure((Resource) anyObject(),
        argThat(new IsMeasure(CoreMetrics.FILE_COMPLEXITY_DISTRIBUTION, "0=0;5=0;10=0;20=0;30=1;60=0;90=0")));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.FUNCTION_COMPLEXITY), eq(3.888888888888889));

    verify(context).saveMeasure((Resource) anyObject(),
        argThat(new IsMeasure(CoreMetrics.FUNCTION_COMPLEXITY_DISTRIBUTION, "1=2;2=4;4=1;6=1;8=0;10=0;12=1;20=0;30=0")));

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.FUNCTION_COMPLEXITY), eq(3.888888888888889));

    verify(context).saveViolation(argThat(new ViolationMatcher("CYCLOMATIC_COMPLEXITY", new Integer(64))));

  }
}
