/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.lcov;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import javax.annotation.CheckForNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.coverage.NewCoverage;

/**
 * http://ltp.sourceforge.net/coverage/lcov/geninfo.1.php
 *
 * Parses one or more LCOV reports and produces Sonar coverage data for resolved input files.
 */
class LCOVParser {

  private static final String SF = "SF:";
  private static final String DA = "DA:";
  private static final String BRDA = "BRDA:";

  private final Map<InputFile, NewCoverage> coverageByFile;
  private final SensorContext context;
  // deduplicated list of unresolved paths (keep order of insertion)
  private final Set<String> unresolvedPaths = new LinkedHashSet<>();
  private final FileLocator fileLocator;
  private int inconsistenciesCounter = 0;

  private static final Logger LOG = LoggerFactory.getLogger(LCOVParser.class);

  private LCOVParser(List<String> lines, SensorContext context, FileLocator fileLocator) {
    this.context = context;
    this.fileLocator = fileLocator;
    this.coverageByFile = parse(lines);
  }

  /**
   * Reads all report files and parses them as a single LCOV stream.
   */
  static LCOVParser create(SensorContext context, List<File> files, FileLocator fileLocator) {
    final List<String> lines = new LinkedList<>();
    for (File file : files) {
      try (Stream<String> fileLines = Files.lines(file.toPath())) {
        lines.addAll(fileLines.toList());
      } catch (IOException e) {
        throw new IllegalArgumentException("Could not read content from file: " + file, e);
      }
    }
    return new LCOVParser(lines, context, fileLocator);
  }

  Map<InputFile, NewCoverage> coverageByFile() {
    return coverageByFile;
  }

  List<String> unresolvedPaths() {
    return new ArrayList<>(unresolvedPaths);
  }

  int inconsistenciesNumber() {
    return inconsistenciesCounter;
  }

  /**
   * Single-pass parser over LCOV lines.
   * <p>
   * The parser keeps track of the current source file record (SF) and routes DA/BRDA entries to
   * the active {@link FileData}. Every SF block gets a unique record index to support branch merge
   * logic across multiple reports.
   */
  private Map<InputFile, NewCoverage> parse(List<String> lines) {
    final Map<InputFile, FileData> files = new HashMap<>();
    FileData fileData = null;
    int sourceFileRecordIndex = 0;
    int reportLineNum = 0;

    for (String line : lines) {
      reportLineNum++;
      if (line.startsWith(SF)) {
        sourceFileRecordIndex++;
        fileData = files.computeIfAbsent(inputFileForSourceFile(line), inputFile ->
          inputFile == null ? null : new FileData(inputFile)
        );
      } else if (fileData != null) {
        if (line.startsWith(DA)) {
          parseLineCoverage(fileData, reportLineNum, line);
        } else if (line.startsWith(BRDA)) {
          parseBranchCoverage(fileData, sourceFileRecordIndex, reportLineNum, line);
        }
      }
    }

    Map<InputFile, NewCoverage> coveredFiles = new HashMap<>();

    for (Map.Entry<InputFile, FileData> e : files.entrySet()) {
      NewCoverage newCoverage = context.newCoverage().onFile(e.getKey());
      e.getValue().save(newCoverage);
      coveredFiles.put(e.getKey(), newCoverage);
    }
    return coveredFiles;
  }

  /**
   * Parses one BRDA entry and stores branch data for deferred per-line merge.
   */
  private void parseBranchCoverage(
    FileData fileData,
    int sourceFileRecordIndex,
    int reportLineNum,
    String line
  ) {
    try {
      // BRDA:<line number>,<block number>,<branch number>,<taken>
      String[] tokens = line.substring(BRDA.length()).trim().split(",");
      String lineNumber = tokens[0];
      String blockNumber = tokens[1];
      String branchNumber = tokens[2];
      String taken = tokens[3];

      fileData.addBranch(
        sourceFileRecordIndex,
        Integer.valueOf(lineNumber),
        blockNumber,
        branchNumber,
        "-".equals(taken) ? 0 : Integer.parseInt(taken)
      );
    } catch (Exception e) {
      logWrongDataWarning("BRDA", reportLineNum, e);
    }
  }

  /**
   * Parses one DA entry and accumulates line hits.
   */
  private void parseLineCoverage(FileData fileData, int reportLineNum, String line) {
    try {
      // DA:<line number>,<execution count>[,<checksum>]
      String execution = line.substring(DA.length());
      String executionCount = execution.substring(execution.indexOf(',') + 1);
      String lineNumber = execution.substring(0, execution.indexOf(','));

      fileData.addLine(Integer.valueOf(lineNumber), Integer.valueOf(executionCount));
    } catch (Exception e) {
      logWrongDataWarning("DA", reportLineNum, e);
    }
  }

  /**
   * Records malformed LCOV data as a non-fatal inconsistency.
   */
  private void logWrongDataWarning(String dataType, int reportLineNum, Exception e) {
    if (LOG.isDebugEnabled()) {
      LOG.debug(
        "Problem during processing LCOV report: can't save {} data for line {} of coverage report file ({}).",
        dataType,
        reportLineNum,
        e.toString()
      );
    }
    inconsistenciesCounter++;
  }

  /**
   * Resolves the SF path to an indexed input file.
   * <p>
   * Resolution order:
   * 1) exact filesystem predicate match (absolute or project-relative path),
   * 2) suffix-based lookup through {@link FileLocator} for cross-tool/cross-root path variants.
   */
  @CheckForNull
  private InputFile inputFileForSourceFile(String line) {
    // SF:<absolute path to the source file>
    String filePath = line.substring(SF.length());
    // some tools (like Istanbul, Karma) provide relative paths, so let's consider them relative to project directory
    InputFile inputFile = context
      .fileSystem()
      .inputFile(context.fileSystem().predicates().hasPath(filePath));
    if (inputFile == null) {
      inputFile = fileLocator.getInputFile(filePath);
    }
    if (inputFile == null) {
      unresolvedPaths.add(filePath);
    }
    return inputFile;
  }

  private static class FileData {

    /**
     * line number -> source-file record index -> branches
     * <p>
     * We keep BRDA entries grouped by source-file record ("SF" block), because the same logical
     * branch can be emitted with different block numbers across reports (for example with sharded
     * runs). We normalize block numbers later when merging records for a line.
     */
    private final Map<Integer, Map<Integer, List<BranchData>>> branches = new HashMap<>();

    /**
     * line number -> execution count
     */
    private final Map<Integer, Integer> hits = new HashMap<>();

    /**
     * Number of lines in the file
     * Required to check if line exist in a file, see {@link #checkLine(Integer)}
     */
    private final int linesInFile;

    private final String filename;
    private static final String WRONG_LINE_EXCEPTION_MESSAGE =
      "Line with number %s doesn't belong to file %s";

    FileData(InputFile inputFile) {
      linesInFile = inputFile.lines();
      filename = inputFile.filename();
    }

    /**
     * Adds one raw BRDA entry.
     * <p>
     * Branches are intentionally stored per source file record and merged only in {@link #save},
     * where we can normalize report-specific block numbering before comparing records.
     */
    void addBranch(
      Integer sourceFileRecordIndex,
      Integer lineNumber,
      String blockNumber,
      String branchNumber,
      Integer taken
    ) {
      checkLine(lineNumber);
      Map<Integer, List<BranchData>> branchesForLine = branches.computeIfAbsent(lineNumber, l ->
        new HashMap<>()
      );
      List<BranchData> branchesForRecord = branchesForLine.computeIfAbsent(
        sourceFileRecordIndex,
        i -> new ArrayList<>()
      );
      branchesForRecord.add(new BranchData(blockNumber, branchNumber, taken));
    }

    /**
     * Adds one DA entry, summing hits across reports.
     */
    void addLine(Integer lineNumber, Integer executionCount) {
      checkLine(lineNumber);
      hits.merge(lineNumber, executionCount, Integer::sum);
    }

    /**
     * Persists merged line and branch coverage into Sonar's coverage model.
     */
    void save(NewCoverage newCoverage) {
      for (Map.Entry<Integer, Integer> e : hits.entrySet()) {
        newCoverage.lineHits(e.getKey(), e.getValue());
      }
      for (Map.Entry<Integer, Map<Integer, List<BranchData>>> e : branches.entrySet()) {
        int line = e.getKey();
        BranchLineCoverage branchLineCoverage = mergeBranchesByLine(e.getValue());

        if (branchLineCoverage.conditions > 0) {
          newCoverage.conditions(line, branchLineCoverage.conditions, branchLineCoverage.covered);
          // Keep historical behavior: branch coverage contributes to line hits as covered branches.
          newCoverage.lineHits(line, hits.getOrDefault(line, 0) + branchLineCoverage.covered);
        }
      }
    }

    /**
     * Merges all BRDA entries for one source line across multiple source-file records.
     * <p>
     * Merge strategy:
     * - normalize block numbers independently per record (to absorb block-number drift);
     * - aggregate coverage by normalized branch key across records;
     * - count uncovered branches only if the same branch is declared in every record.
     * <p>
     * This avoids denominator inflation when two reports describe the same logical branch with
     * different block numbers or when a zero-hit branch is omitted from some reports.
     */
    private static BranchLineCoverage mergeBranchesByLine(
      Map<Integer, List<BranchData>> branchesBySourceFileRecord
    ) {
      Map<String, Integer> coveredByBranch = new HashMap<>();
      Map<String, Integer> presenceByBranch = new HashMap<>();
      int totalRecords = branchesBySourceFileRecord.size();

      for (List<BranchData> branchesForRecord : branchesBySourceFileRecord.values()) {
        // Collapses duplicates within a single SF record before cross-record aggregation.
        Map<String, Integer> coveredInCurrentRecord = new HashMap<>();
        // Map report-specific block ids to deterministic local ids (0,1,...) by sorted block value.
        Map<String, String> normalizedBlockByOriginal = buildNormalizedBlockMapping(
          branchesForRecord
        );

        for (BranchData branchData : branchesForRecord) {
          String normalizedBlockNumber = normalizedBlockByOriginal.get(branchData.blockNumber);
          String normalizedBranchKey = normalizedBlockNumber + ":" + branchData.branchNumber;
          coveredInCurrentRecord.merge(normalizedBranchKey, branchData.taken, Integer::sum);
        }

        for (Map.Entry<String, Integer> branchCoverage : coveredInCurrentRecord.entrySet()) {
          coveredByBranch.merge(branchCoverage.getKey(), branchCoverage.getValue(), Integer::sum);
          // Number of SF records where this normalized branch exists.
          presenceByBranch.merge(branchCoverage.getKey(), 1, Integer::sum);
        }
      }

      int conditions = 0;
      int covered = 0;
      for (Map.Entry<String, Integer> branchCoverage : coveredByBranch.entrySet()) {
        int taken = branchCoverage.getValue();
        int presence = presenceByBranch.getOrDefault(branchCoverage.getKey(), 0);

        if (taken > 0) {
          conditions++;
          covered++;
          // Any observed hit marks the branch covered in the merged result.
        } else if (presence == totalRecords) {
          // Zero-hit branch only counts when declared by every record for this line.
          conditions++;
        }
      }
      return new BranchLineCoverage(conditions, covered);
    }

    /**
     * Creates a deterministic local block index for a single source-file record.
     * <p>
     * We sort distinct LCOV block ids to make normalization independent from BRDA emission order.
     */
    private static Map<String, String> buildNormalizedBlockMapping(
      List<BranchData> branchesForRecord
    ) {
      List<String> sortedBlockNumbers = branchesForRecord
        .stream()
        .map(branch -> branch.blockNumber)
        .distinct()
        .sorted(FileData::compareBlockNumbers)
        .toList();

      Map<String, String> normalizedBlockByOriginal = new HashMap<>();
      for (int i = 0; i < sortedBlockNumbers.size(); i++) {
        normalizedBlockByOriginal.put(sortedBlockNumbers.get(i), String.valueOf(i));
      }
      return normalizedBlockByOriginal;
    }

    private static int compareBlockNumbers(String left, String right) {
      try {
        return Long.compare(Long.parseLong(left), Long.parseLong(right));
      } catch (NumberFormatException e) {
        return left.compareTo(right);
      }
    }

    /**
     * Guards against malformed coverage pointing to non-existent source lines.
     */
    private void checkLine(Integer lineNumber) {
      if (lineNumber < 1 || lineNumber > linesInFile) {
        throw new IllegalArgumentException(
          String.format(WRONG_LINE_EXCEPTION_MESSAGE, lineNumber, filename)
        );
      }
    }

    private record BranchData(String blockNumber, String branchNumber, int taken) {}

    private record BranchLineCoverage(int conditions, int covered) {}
  }
}
