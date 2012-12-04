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
package org.sonar.plugins.javascript.jstestdriver;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.List;
import java.util.Map;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.measures.CoverageMeasuresBuilder;
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
    Map<String, CoverageMeasuresBuilder> list = parser.parseFile(coverageReport);
    assertEquals(3, list.size());

    // verify second file
    CoverageMeasuresBuilder measuresBuilder = list.get("D:\\Eriks\\workspace\\sample\\src\\test\\js\\com\\company\\PersonTest.js");
    assertEquals(5, measuresBuilder.getLinesToCover());
    assertEquals(5, measuresBuilder.getCoveredLines());
    assertEquals(0,measuresBuilder.getConditions());
    assertEquals(0,measuresBuilder.getCoveredConditions());
  }
}
