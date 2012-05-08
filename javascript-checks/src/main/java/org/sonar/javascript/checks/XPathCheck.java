/*
 * Copyright (C) 2010 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package org.sonar.javascript.checks;

import com.sonar.sslr.squid.checks.AbstractXPathCheck;
import org.sonar.check.Cardinality;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptGrammar;

@Rule(
  key = "XPath",
  priority = Priority.MAJOR,
  cardinality = Cardinality.MULTIPLE)
public class XPathCheck extends AbstractXPathCheck<EcmaScriptGrammar> {

  private static final String DEFAULT_XPATH_QUERY = "";
  private static final String DEFAULT_MESSAGE = "The XPath expression matches this piece of code";

  @RuleProperty(key = "xpathQuery", description = "The XPath query.", defaultValue = "" + DEFAULT_XPATH_QUERY)
  public String xpathQuery = DEFAULT_XPATH_QUERY;

  @RuleProperty(key = "message", description = "The violation message.", defaultValue = "" + DEFAULT_XPATH_QUERY)
  public String message = DEFAULT_MESSAGE;

  @Override
  public String getXPathQuery() {
    return xpathQuery;
  }

  @Override
  public String getMessage() {
    return message;
  }

}
