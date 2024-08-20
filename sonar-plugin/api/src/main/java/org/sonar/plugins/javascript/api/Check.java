package org.sonar.plugins.javascript.api;

import org.sonar.check.Rule;

public class Check implements EslintBasedCheck {
  /**
   * This should be named `key()`, but we keep the compatibility with the legacy semantic.
   */
  @Override
  public String eslintKey() {
    return this.getClass().getAnnotation(Rule.class).key();
  }
}
