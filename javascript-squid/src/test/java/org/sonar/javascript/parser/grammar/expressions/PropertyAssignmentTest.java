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
package org.sonar.javascript.parser.grammar.expressions;

import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.parser.EcmaScriptGrammarImpl;

import static org.sonar.sslr.tests.Assertions.assertThat;

public class PropertyAssignmentTest {

  EcmaScriptGrammar g = new EcmaScriptGrammarImpl();

  @Test
  public void ok() {
    g.propertyName.mock();
    g.functionBody.mock();
    g.propertySetParameterList.mock();
    g.assignmentExpression.mock();

    assertThat(g.propertyAssignment)
        .matches("propertyName : assignmentExpression")
        .matches("get propertyName () { functionBody }")
        .matches("set propertyName ( propertySetParameterList ) { functionBody }");
  }

}
