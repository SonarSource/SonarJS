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

import java.util.Collection;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;

public final class JavaScriptFileCoverage {

  private CoverageMeasuresBuilder coverageData = CoverageMeasuresBuilder.create();
  private String filePath;

  public CoverageMeasuresBuilder getCoverageData() {
    return coverageData;
  }

  public Collection<Measure> getCoverageMeasures() {
    return coverageData.createMeasures();
  }

  public String getFilePath() {
    return filePath;
  }

  public void setFilePath(String filePath) {
    //Handle unix like paths in reports
    if (filePath.startsWith("./")) {
      this.filePath = filePath.substring(2);
    } else {
      this.filePath = filePath; 
    }
  }

  public void addLine(int lineNumber, int executionCount) {
    coverageData.setHits(lineNumber, executionCount);
  }

  public void addConditions(int lineNumber, int branches, int branchesTaken) {
    coverageData.setConditions(lineNumber, branches, branchesTaken);
  }

}
