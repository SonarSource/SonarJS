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
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.apache.commons.io.FileUtils;
import org.apache.commons.lang.BooleanUtils;
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
  
  private static final String SOURCE_FILE_TOKEN = "SF:";
  private static final String LINE_EXECUTION_TOKEN = "DA:";
  private static final String BRANCH_LINE_EXECUTION_TOKEN = "BRDA:";
  private static final String END_RECORD_TOKEN = "end_of_record";
  
  private class BranchData {
    private int branches = 0;
    private int visitedBranches = 0;

    public int getVisitedBranches() {
      return visitedBranches;
    }
    
    public int getBranches() {
      return branches;
    }
    
    public void addBranch(boolean visited) {
      this.branches++;
      if (visited) {
        this.visitedBranches++;
      }
    }
  }
  
  private Map<String, BranchData> branches = new HashMap<String, BranchData>();

  public List<JavaScriptFileCoverage> parseFile(File file) {
    List<String> lines = new LinkedList<String>();
    try {
      lines = FileUtils.readLines(file);
    } catch (IOException e) {
      LOG.debug("Cound not read content from file: {}", file.getAbsolutePath(), e);
    }

    List<JavaScriptFileCoverage> coveredFiles = new LinkedList<JavaScriptFileCoverage>();

    JavaScriptFileCoverage fileCoverage = new JavaScriptFileCoverage();
    branches.clear();
    
    for (String line : lines) {
      if (line.startsWith(SOURCE_FILE_TOKEN)) {
        fileCoverage = new JavaScriptFileCoverage();
        String filePath = line.substring(line.indexOf(SOURCE_FILE_TOKEN) + SOURCE_FILE_TOKEN.length());

        fileCoverage.setFilePath(filePath);

      } else if (line.startsWith(LINE_EXECUTION_TOKEN)) {
        //  DA:<line number>,<execution count>[,<checksum>]
        String execution = line.substring(line.indexOf(LINE_EXECUTION_TOKEN) + LINE_EXECUTION_TOKEN.length());
        String executionCount = execution.substring(execution.indexOf(',') + 1);
        String lineNumber = execution.substring(0, execution.indexOf(','));

        fileCoverage.addLine(Integer.valueOf(lineNumber).intValue(), Integer.valueOf(executionCount).intValue());

      } else if (line.startsWith(BRANCH_LINE_EXECUTION_TOKEN)) {
        // BRDA:<line number>,<block number>,<branch number>,<taken>
        String execution = line.substring(line.indexOf(BRANCH_LINE_EXECUTION_TOKEN) + 
            BRANCH_LINE_EXECUTION_TOKEN.length()).trim();
        String[] tokens = execution.split(",");
        String lineNumber = tokens[0];
        boolean branchTaken = BooleanUtils.toBoolean(tokens[3], "1", "0");
        if (!branches.containsKey(lineNumber)) {
          branches.put(lineNumber, new BranchData());
        }
        branches.get(lineNumber).addBranch(branchTaken);
      } else if (line.indexOf(END_RECORD_TOKEN) > -1) {
        addBranchData(fileCoverage);
        coveredFiles.add(fileCoverage);
        branches.clear();
      }
    }
    return coveredFiles;
  }

  private void addBranchData(JavaScriptFileCoverage fileCoverage) {
    for (String key : branches.keySet()) {
      LOG.debug("\nBranches: {}, visited: {}", branches.get(key).getBranches(), branches.get(key).getVisitedBranches());
      fileCoverage.addConditions(Integer.valueOf(key).intValue(), branches.get(key).getBranches(), branches.get(key).getVisitedBranches());
    }
  }
}
