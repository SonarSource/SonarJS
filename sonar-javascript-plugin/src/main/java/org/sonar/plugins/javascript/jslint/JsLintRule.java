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

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.sonar.api.rules.RuleParam;
import org.sonar.api.rules.RulePriority;

public class JsLintRule {

  private String key;
  private String name;
  private RulePriority priority;
  private String description;
  private List<RuleParam> params = new ArrayList<RuleParam>();

  /*
   * if true, opposite value should be passed to jsLint
   * 
   * example rules: "Tolerate debugger statements", "Tolerate eval", "Tolerate sloppy line breaking"..
   */
  private boolean inverse = false;

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public JsLintRule() {

  }

  public JsLintRule(String key, String name, boolean inverse, RulePriority priority, String... messages) {

    this.inverse = inverse;
    this.key = key;
    this.name = name;
    this.priority = priority;
    for (String message : messages) {
      this.messages.add(message);
    }
  }

  public RulePriority getPriority() {
    return priority;
  }

  public void setPriority(RulePriority priority) {
    this.priority = priority;
  }

  private List<String> messages = new ArrayList<String>();

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public List<String> getMessages() {
    return messages;
  }

  public void setMessages(List<String> messages) {
    this.messages = messages;
  }

  public boolean isInverse() {
    return inverse;
  }

  public void setInverse(boolean inverse) {
    this.inverse = inverse;
  }

  public boolean hasMessage(String message) {
    for (String registeredMessage : messages) {
      if (registeredMessage.equals(message)) {
        return true;
      }
    }
    return false;
  }

  public RuleParam createParameter() {
    RuleParam parameter = new RuleParam();
    params.add(parameter);
    return parameter;
  }

  public List<RuleParam> getParams() {
    return params;
  }

  public RuleParam getParam(String key) {
    for (RuleParam param : params) {
      if (StringUtils.equals(key, param.getKey())) {
        return param;
      }
    }
    return null;
  }
}
