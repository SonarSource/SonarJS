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

import org.junit.Test;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.plugins.javascript.coverage.LCOVParser;

import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.Map;

import static org.fest.assertions.Assertions.assertThat;

public class JsTestDriverLCOVParserTest {

  private LCOVParser parser = new LCOVParser();

  @Test
  public void testParser() throws URISyntaxException {
    URL uri = getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/jsTestDriver.conf-coverage.dat");
    File coverageReport = new File(uri.toURI());
    Map<String, CoverageMeasuresBuilder> coveredFiles = parser.parseFile(coverageReport);
    assertThat(coveredFiles).hasSize(3);

    // verify second file
    CoverageMeasuresBuilder fileCoverage = coveredFiles.get("D:\\Eriks\\workspace\\sample\\src\\test\\js\\com\\company\\PersonTest.js");
    assertThat(fileCoverage.getLinesToCover()).isEqualTo(5);
    assertThat(fileCoverage.getCoveredLines()).isEqualTo(5);
  }

}
