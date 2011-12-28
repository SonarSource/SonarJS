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

package org.sonar.plugins.javascript.jstestdriver;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.plugins.javascript.core.JavaScript;

public class JsTestDriverSurefireSensorTest {

  private JsTestDriverSurefireSensor sensor;
  SensorContext context;

  @Before
  public void init() {
    sensor = new JsTestDriverSurefireSensor(new JavaScript(null));
    context = mock(SensorContext.class);
  }

  @Test
  public void testGetUnitTestFileName() {
    assertEquals("com/company/PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.com.company.PersonTest"));
    assertEquals("PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.PersonTest"));

  }
}
