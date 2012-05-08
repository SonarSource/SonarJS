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

package org.sonar.plugins.javascript.complexity;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;

import org.junit.Test;
import org.sonar.api.utils.SonarException;

public class JavaScriptPluginExceptionTest {

  @Test
  public void testException() {
    Exception e = new JavaScriptPluginException();
    e = new JavaScriptPluginException("Exception message");
    e = new JavaScriptPluginException(new Exception());
    Exception cause = new SonarException("cause");
    e = new JavaScriptPluginException("Message Text", cause);

    assertEquals("Message Text", e.getMessage());
    assertSame(cause, e.getCause());
  }
}
