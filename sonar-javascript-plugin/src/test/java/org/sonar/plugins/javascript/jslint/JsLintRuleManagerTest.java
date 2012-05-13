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

import static org.junit.Assert.*;

import java.util.List;

import org.junit.Test;

import com.googlecode.jslint4java.Option;

public class JsLintRuleManagerTest {

  private JsLintRuleManager manager = new JsLintRuleManager();

  @Test
  public void testGetJsLintRules() {
    List<JsLintRule> list = manager.getJsLintRules();
    assertEquals("Incorrect JsLintRule list size", 3, list.size());
  }

  @Test
  public void testGetRuleIdByMessage() {
    assertEquals("Incorrect rule id returned", "EVIL", manager.getRuleIdByMessage("eval is evil.", "invalid_raw_message"));
    assertEquals("Incorrect rule id returned", "WHITE", manager.getRuleIdByMessage("invalid_reason_message", "Missing space after '{a}'."));

    assertEquals("Incorrect rule id returned", JsLintRuleManager.OTHER_RULES_KEY, manager.getRuleIdByMessage("invalid_reason_message", "not registered message"));

  }

  @Test
  public void testIsRuleInverse() {
    assertTrue("Incorrectly assessed rule inversity", manager.isRuleInverse("EVIL"));
    assertFalse("Incorrectly assessed rule inversity", manager.isRuleInverse("MAXLEN"));
  }

  @Test
  public void testGetOptionByName() {
    assertEquals("Incorrect Option returned", Option.MAXLEN, manager.getOptionByName("MAXLEN"));
    assertEquals("Method should not be case sensitive", Option.MAXLEN, manager.getOptionByName("maxlen"));
  }

}
