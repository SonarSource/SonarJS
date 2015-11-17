/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.plugins.javascript.lcov;

import com.google.common.base.Objects;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import javax.annotation.CheckForNull;
import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.measures.CoverageMeasuresBuilder;

/**
 * http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
 */
public final class LCOVParser {

  private static final String SF = "SF:";
  private static final String DA = "DA:";
  private static final String BRDA = "BRDA:";

  private final Map<InputFile, CoverageMeasuresBuilder> coverageByFile;
  private final FileSystem fs;
  private final List<String> unresolvedPaths = Lists.newArrayList();

  private static final Logger LOG = LoggerFactory.getLogger(LCOVParser.class);

  private LCOVParser(FileSystem fs, List<String> lines) {
    this.fs = fs;
    this.coverageByFile = parse(lines);
  }

  public static Map<InputFile, CoverageMeasuresBuilder> parse(FileSystem fs, List<String> lines) {
    return new LCOVParser(fs, lines).coverageByFile();
  }

  public static LCOVParser create(FileSystem fs, File file) {
    final List<String> lines;
    try {
      lines = FileUtils.readLines(file);
    } catch (IOException e) {
      throw new IllegalArgumentException("Could not read content from file: " + file, e);
    }
    return new LCOVParser(fs, lines);
  }

  public Map<InputFile, CoverageMeasuresBuilder> coverageByFile() {
    return coverageByFile;
  }

  public List<String> unresolvedPaths() {
    return unresolvedPaths;
  }

  private Map<InputFile, CoverageMeasuresBuilder> parse(List<String> lines) {
    final Map<InputFile, FileData> files = Maps.newHashMap();
    FileData fileData = null;

    for (String line : lines) {
      if (line.startsWith(SF)) {
        // SF:<absolute path to the source file>
        fileData = loadCurrentFileData(files, line);
      } else if (fileData != null) {
        if (line.startsWith(DA)) {
          // DA:<line number>,<execution count>[,<checksum>]
          String execution = line.substring(DA.length());
          String executionCount = execution.substring(execution.indexOf(',') + 1);
          String lineNumber = execution.substring(0, execution.indexOf(','));

          try {
            fileData.addLine(Integer.valueOf(lineNumber), Integer.valueOf(executionCount));
          } catch (IllegalArgumentException e) {
            LOG.warn("Can't save DA data. Cause: " + e.getMessage(), e);
          }
        } else if (line.startsWith(BRDA)) {
          // BRDA:<line number>,<block number>,<branch number>,<taken>
          String[] tokens = line.substring(BRDA.length()).trim().split(",");
          String lineNumber = tokens[0];
          String branchNumber = tokens[1] + tokens[2];
          String taken = tokens[3];

          try {
            fileData.addBranch(Integer.valueOf(lineNumber), branchNumber, "-".equals(taken) ? 0 : Integer.valueOf(taken));
          } catch (IllegalArgumentException e) {
            LOG.warn("Can't save BRDA data. Cause: " + e.getMessage(), e);
          }
        }
      }

    }

    Map<InputFile, CoverageMeasuresBuilder> coveredFiles = Maps.newHashMap();
    for (Map.Entry<InputFile, FileData> e : files.entrySet()) {
      coveredFiles.put(e.getKey(), e.getValue().convert());
    }
    return coveredFiles;
  }

  @CheckForNull
  private FileData loadCurrentFileData(final Map<InputFile, FileData> files, String line) {
    String filePath = line.substring(SF.length());
    FileData fileData = null;
    // some tools (like Istanbul, Karma) provide relative paths, so let's consider them relative to project directory
    InputFile inputFile = fs.inputFile(fs.predicates().hasPath(filePath));
    if (inputFile != null) {
      fileData = files.get(inputFile);
      if (fileData == null) {
        fileData = new FileData(inputFile);
        files.put(inputFile, fileData);
      }
    } else {
      unresolvedPaths.add(filePath);
    }
    return fileData;
  }

  private static class FileData {
    /**
     * line number -> branch number -> taken
     */
    private Map<Integer, Map<String, Integer>> branches = Maps.newHashMap();

    /**
     * line number -> execution count
     */
    private Map<Integer, Integer> hits = Maps.newHashMap();

    /**
     * Number of lines in the file
     * Required to check if line exist in a file, see {@link #checkLine(Integer)}
     */
    private final int linesInFile;

    private final String filename;
    private static final String WRONG_LINE_EXCEPTION_MESSAGE = "Line with number %s doesn't belong to file %s";

    public FileData(InputFile inputFile) {
      linesInFile = inputFile.lines();
      filename = inputFile.relativePath();
    }

    public void addBranch(Integer lineNumber, String branchNumber, Integer taken) {
      checkLine(lineNumber);

      Map<String, Integer> branchesForLine = branches.get(lineNumber);
      if (branchesForLine == null) {
        branchesForLine = Maps.newHashMap();
        branches.put(lineNumber, branchesForLine);
      }
      Integer currentValue = branchesForLine.get(branchNumber);
      branchesForLine.put(branchNumber, Objects.firstNonNull(currentValue, 0) + taken);
    }

    public void addLine(Integer lineNumber, Integer executionCount) {
      checkLine(lineNumber);

      Integer currentValue = hits.get(lineNumber);
      hits.put(lineNumber, Objects.firstNonNull(currentValue, 0) + executionCount);
    }

    public CoverageMeasuresBuilder convert() {
      CoverageMeasuresBuilder result = CoverageMeasuresBuilder.create();
      for (Map.Entry<Integer, Integer> e : hits.entrySet()) {
        result.setHits(e.getKey(), e.getValue());
      }
      for (Map.Entry<Integer, Map<String, Integer>> e : branches.entrySet()) {
        int conditions = e.getValue().size();
        int covered = 0;
        for (Integer taken : e.getValue().values()) {
          if (taken > 0) {
            covered++;
          }
        }
        result.setConditions(e.getKey(), conditions, covered);
      }
      return result;
    }

    private void checkLine(Integer lineNumber) {
      if (lineNumber < 1 || lineNumber > linesInFile) {
        throw new IllegalArgumentException(String.format(WRONG_LINE_EXCEPTION_MESSAGE, lineNumber, filename));
      }
    }

  }

}
