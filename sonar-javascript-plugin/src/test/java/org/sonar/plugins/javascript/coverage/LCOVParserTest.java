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
package org.sonar.plugins.javascript.coverage;

import org.junit.Test;

import java.util.Arrays;
import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public class LCOVParserTest {

  @Test
  public void test() {
    LCOVParser parser = new LCOVParser();
    List<JavaScriptFileCoverage> result = parser.parse(Arrays.asList(
        "TN:",
        "SF:file.js",
        "FN:2,(anonymous_1)",
        "FNDA:2,(anonymous_1)",
        "DA:2,1",
        "BRDA:11,1,0,1",
        "end_of_record"));
    assertThat(result).hasSize(1);
    JavaScriptFileCoverage fileCoverage = result.get(0);
    assertThat(fileCoverage.getFilePath()).isEqualTo("file.js");
    assertThat(fileCoverage.getLinesToCover()).isEqualTo(1);
    assertThat(fileCoverage.getCoveredLines()).isEqualTo(1);
    assertThat(fileCoverage.getUncoveredLines()).isEqualTo(0);
  }

}
