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

import com.google.common.collect.Maps;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.measures.CoverageMeasuresBuilder;

import java.io.File;
import java.io.IOException;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
 */
public final class LCOVParser {

  private static final Logger LOG = LoggerFactory.getLogger(LCOVParser.class);

  private static final String SF = "SF:";
  private static final String DA = "DA:";
  private static final String BRDA = "BRDA:";
  private static final String END_RECORD = "end_of_record";

  public Map<String, CoverageMeasuresBuilder> parseFile(File file) {
    List<String> lines = new LinkedList<String>();
    try {
      lines = FileUtils.readLines(file);
    } catch (IOException e) {
      LOG.debug("Cound not read content from file: {}", file.getAbsolutePath(), e);
    }
    return parse(lines);
  }

  public Map<String, CoverageMeasuresBuilder> parse(List<String> lines) {
    Map<String, CoverageMeasuresBuilder> coveredFiles = Maps.newHashMap();
    Map<String, BranchData> branches = Maps.newHashMap();
    String filePath = null;
    CoverageMeasuresBuilder fileCoverage = CoverageMeasuresBuilder.create();

    for (String line : lines) {
      if (line.startsWith(SF)) {
        fileCoverage = CoverageMeasuresBuilder.create();
        filePath = line.substring(SF.length());

      } else if (line.startsWith(DA)) {
        // DA:<line number>,<execution count>[,<checksum>]
        String execution = line.substring(DA.length());
        String executionCount = execution.substring(execution.indexOf(',') + 1);
        String lineNumber = execution.substring(0, execution.indexOf(','));

        fileCoverage.setHits(Integer.valueOf(lineNumber).intValue(), Integer.valueOf(executionCount).intValue());

      } else if (line.startsWith(BRDA)) {
        // BRDA:<line number>,<block number>,<branch number>,<taken>
        String[] tokens = line.substring(BRDA.length()).trim().split(",");
        String lineNumber = tokens[0];
        boolean taken = "1".equals(tokens[3]);

        BranchData branchData = branches.get(lineNumber);
        if (branchData == null) {
          branchData = new BranchData();
          branches.put(lineNumber, branchData);
        }
        branchData.branches++;
        if (taken) {
          branchData.visitedBranches++;
        }

      } else if (END_RECORD.equals(line.trim())) {
        for (Map.Entry<String, BranchData> entry : branches.entrySet()) {
          fileCoverage.setConditions(Integer.valueOf(entry.getKey()), entry.getValue().branches, entry.getValue().visitedBranches);
        }
        branches.clear();
        coveredFiles.put(filePath, fileCoverage);
      }
    }
    return coveredFiles;
  }

  private static class BranchData {
    int branches;
    int visitedBranches;
  }

}
