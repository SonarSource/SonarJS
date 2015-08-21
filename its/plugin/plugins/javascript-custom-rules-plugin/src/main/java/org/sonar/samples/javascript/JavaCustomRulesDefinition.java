/*
 * Copyright (C) 2009-2013 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package org.sonar.samples.javascript;


import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;

public class JavaCustomRulesDefinition extends CustomJavaScriptRulesDefinition {

  @Override
  public String repositoryName() {
    return "Custom Repository";
  }

  @Override
  public String repositoryKey() {
    return "javascript-custom-rules";
  }

  @Override
  public Class[] checkClasses() {
    return new Class[] {
      BaseTreeVisitorCheck.class,
      SubscriptionBaseVisitorCheck.class
    };
  }
}
