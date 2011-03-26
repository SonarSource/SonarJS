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
    assertEquals("Incorrect rule id returned", "EVIL", manager.getRuleIdByMessage("eval is evil."));
    assertEquals("Incorrect rule id returned", "WHITE", manager.getRuleIdByMessage("Missing space after '{a}'."));

    assertEquals("Incorrect rule id returned", JsLintRuleManager.OTHER_RULES_KEY, manager.getRuleIdByMessage("not registered message"));

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
