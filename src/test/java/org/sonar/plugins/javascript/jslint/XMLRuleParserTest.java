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

package org.sonar.plugins.javascript.jslint;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;

import java.io.StringReader;
import java.util.List;

import org.hamcrest.core.Is;
import org.junit.Test;
import org.sonar.api.rules.RulePriority;
import org.sonar.api.utils.SonarException;

public class XMLRuleParserTest {

  @Test
  public void parseXml() {
    List<JsLintRule> rules = new JsLintXmlRuleParser().parse(getClass().getResourceAsStream(
      "/org/sonar/plugins/javascript/jslint/rules.xml"));
    assertThat(rules.size(), is(3));

    JsLintRule rule = rules.get(0);
    assertThat(rule.getName(), is("Do Not Tolerate eval"));
    assertThat(
      rule.getDescription(),
      is("The eval function (and its relatives, Function, setTimeout, and setInterval) provide access to the JavaScript compiler. This is sometimes necessary, but in most cases it indicates the presence of extremely bad coding. The eval function is the most misused feature of JavaScript."));
    assertThat(rule.getPriority(), Is.is(RulePriority.MINOR));

    assertThat(rule.getMessages().size(), is(3));
    assertThat(rule.isInverse(), is(true));

    JsLintRule minimalRule = rules.get(1);
    assertThat(minimalRule.getKey(), is("MAXLEN"));
    assertThat(minimalRule.getParams().size(), is(1));
    assertThat(minimalRule.isInverse(), is(false));

  }

  @Test(expected = SonarException.class)
  public void failIfMissingRuleKey() {
    new JsLintXmlRuleParser().parse(new StringReader("<rules><rule><name>Foo</name></rule></rules>"));
  }

  @Test(expected = SonarException.class)
  public void failIfMissingPropertyKey() {
    new JsLintXmlRuleParser().parse(new StringReader("<rules><rule><key>foo</key><name>Foo</name><param></param></rule></rules>"));
  }

  @Test
  public void utf8Encoding() {
    List<JsLintRule> rules = new JsLintXmlRuleParser().parse(getClass().getResourceAsStream(
      "/org/sonar/api/rules/XMLRuleParserTest/utf8.xml"));
    assertThat(rules.size(), is(1));
    JsLintRule rule = rules.get(0);
    assertThat(rule.getKey(), is("com.puppycrawl.tools.checkstyle.checks.naming.LocalVariableNameCheck"));
    assertThat(rule.getName(), is("M & M"));
    assertThat(rule.getDescription().charAt(0), is('\u00E9'));
    assertThat(rule.getDescription().charAt(1), is('\u00E0'));
    assertThat(rule.getDescription().charAt(2), is('\u0026'));
  }
}