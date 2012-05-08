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

import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.List;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.coverage.JavaScriptFileCoverage;
import org.sonar.plugins.javascript.coverage.LCOVParser;

public class JsTestDriverLCOVParserTest {

  LCOVParser parser = new LCOVParser();

  @Before
  public void init() {

  }

  @Test
  public void testParser() throws URISyntaxException {
    URL uri = getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/jsTestDriver.conf-coverage.dat");
    File coverageReport = new File(uri.toURI());
    List<JavaScriptFileCoverage> list = parser.parseFile(coverageReport);
    assertEquals(3, list.size());

    // verify second file
    JavaScriptFileCoverage fileCoverage = list.get(1);
    assertEquals("D:\\Eriks\\workspace\\sample\\src\\test\\js\\com\\company\\PersonTest.js", fileCoverage.getFilePath());
    assertEquals(5, fileCoverage.getLinesToCover());
    assertEquals(5, fileCoverage.getCoveredLines());

  }
}
