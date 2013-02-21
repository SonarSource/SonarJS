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

import java.io.File;
import java.io.IOException;
import java.util.LinkedList;
import java.util.List;

import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Parses LCOV file coverage report files according to LCOV spec
 * http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
 * 
 * @author Eriks.Nukis
 * @author Gleb.Godonoga
 * 
 */
public final class LCOVParser implements CoverageParser{

  private static final Logger LOG = LoggerFactory.getLogger(LCOVParser.class);
  private Integer branchesOnCurrentLine = 0;
  private Integer currentTakenBranches = 0;
  private Integer currentBranchLine = -1;

  public List<JavaScriptFileCoverage> parseFile(File file) {
    List<String> lines = new LinkedList<String>();
    try {
      lines = FileUtils.readLines(file);
    } catch (IOException e) {
      LOG.debug("Cound not read content from file: {}", file.getAbsolutePath(), e);
    }

    List<JavaScriptFileCoverage> coveredFiles = new LinkedList<JavaScriptFileCoverage>();

    JavaScriptFileCoverage fileCoverage = new JavaScriptFileCoverage();

    for (String line : lines) {
      if (line.startsWith("SF:")) {
        assertBranchCoverageFinalization(fileCoverage);
        fileCoverage = new JavaScriptFileCoverage();
        String filePath = line.substring(line.indexOf("SF:") + 3);

        fileCoverage.setFilePath(filePath);

      } else if (line.startsWith("DA:")) {
        //  DA:<line number>,<execution count>[,<checksum>]
        assertBranchCoverageFinalization(fileCoverage);
        String execution = line.substring(line.indexOf("DA:") + 3);
        String executionCount = execution.substring(execution.indexOf(',') + 1);
        String lineNumber = execution.substring(0, execution.indexOf(','));

        fileCoverage.addLine(Integer.valueOf(lineNumber).intValue(), Integer.valueOf(executionCount).intValue());

      } else if (line.startsWith("BRDA:")) {
        // BRDA:<line number>,<block number>,<branch number>,<taken>
        String execution = line.substring(line.indexOf("BRDA:") + 5).trim();
        String[] values = execution.split(",");
        String lineNumber = values[0];
        String branchTaken = values[3];
        processBranchCoverage(Integer.valueOf(lineNumber).intValue(), Integer.valueOf(branchTaken).intValue(), fileCoverage);
      } else if (line.indexOf("end_of_record") > -1) {
        assertBranchCoverageFinalization(fileCoverage);
        coveredFiles.add(fileCoverage);
      } else {
        assertBranchCoverageFinalization(fileCoverage);
      }
    }
    return coveredFiles;
  }

  private void processBranchCoverage(int lineNumber, int branchTaken, JavaScriptFileCoverage fileCoverage) {
    if (currentBranchLine == lineNumber) {
      branchesOnCurrentLine++;
      currentTakenBranches += branchTaken;
    } else {
      if (currentBranchLine != -1) {
        //We finished tracking one branch, and stepped to the next one
        //Add data to coverage, reset counters and start tracking again.
        fileCoverage.addConditions(currentBranchLine, branchesOnCurrentLine, currentTakenBranches);
      }
      currentBranchLine = lineNumber;
      branchesOnCurrentLine = 1;
      currentTakenBranches = 0;
      currentTakenBranches += branchTaken;      
    }
  }
  private void assertBranchCoverageFinalization(JavaScriptFileCoverage fileCoverage) {
    if (currentBranchLine != -1 && branchesOnCurrentLine != 0) {
      fileCoverage.addConditions(currentBranchLine, branchesOnCurrentLine, currentTakenBranches);
      currentBranchLine = -1;
      branchesOnCurrentLine = 0;
    }
  }
}
