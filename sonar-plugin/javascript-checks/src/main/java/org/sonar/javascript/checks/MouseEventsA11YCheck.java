package org.sonar.javascript.checks;

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S1082")
public class MouseEventsA11YCheck implements EslintBasedCheck {

  @Override
  public String eslintKey() {
    return "mouse-events-a11y";
  }
}
