/*
 * JavaScript Type Inference Plugin
 * Copyright (C) 2015 ${owner}
 * sonarqube@googlegroups.com
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
package org.sonar.samples.javascript;

import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;

public class JavaTypeInferenceRulesDefinition extends CustomJavaScriptRulesDefinition {

  @Override
  public String repositoryName() {
    return "Type Inference Repository";
  }

  @Override
  public String repositoryKey() {
    return "javascript_type_inference";
  }

  @Override
  public Class[] checkClasses() {
    return new Class[] {TypeCheck.class, UnknownCheck.class};
  }
}
