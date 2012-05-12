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
package org.sonar.javascript.checks;

import com.sonar.sslr.squid.checks.AbstractLineLengthCheck;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.api.EcmaScriptGrammar;

@Rule(
  key = "LineLength",
  name = "Maximum authorized line length exceeded",
  priority = Priority.MINOR,
  description = "<p>Maximum authorized line length exceeded.</p>")
public class LineLengthCheck extends AbstractLineLengthCheck<EcmaScriptGrammar> {

  private static final int DEFAULT_MAXIMUM_LINE_LENHGTH = 80;

  @RuleProperty(
    key = "maximumLineLength",
    description = "The maximum authorized line length.",
    defaultValue = "" + DEFAULT_MAXIMUM_LINE_LENHGTH)
  public int maximumLineLength = DEFAULT_MAXIMUM_LINE_LENHGTH;

  @Override
  public int getMaximumLineLength() {
    return maximumLineLength;
  }

}
