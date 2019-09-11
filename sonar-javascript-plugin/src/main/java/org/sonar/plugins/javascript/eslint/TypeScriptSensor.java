/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.cpd.NewCpdTokens;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.highlighting.TypeOfText;
import org.sonar.api.batch.sensor.symbol.NewSymbol;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.CpdToken;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Highlight;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.HighlightedSymbol;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Issue;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Location;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.Metrics;

import static java.lang.String.format;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  private List<String> tsconfigs;
  private NoSonarFilter noSonarFilter;
  private FileLinesContextFactory fileLinesContextFactory;

  /**
   * Required for SonarLint
   */
  public TypeScriptSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter, FileLinesContextFactory fileLinesContextFactory, EslintBridgeServer eslintBridgeServer) {
    this(checkFactory, noSonarFilter, fileLinesContextFactory, eslintBridgeServer, null);
  }

  public TypeScriptSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter,
      FileLinesContextFactory fileLinesContextFactory, EslintBridgeServer eslintBridgeServer,
      @Nullable AnalysisWarnings analysisWarnings) {
    super(checks(checkFactory), eslintBridgeServer, analysisWarnings);
    this.noSonarFilter = noSonarFilter;
    this.fileLinesContextFactory = fileLinesContextFactory;
  }

  private static JavaScriptChecks checks(CheckFactory checkFactory) {
    return JavaScriptChecks.createJavaScriptChecks(checkFactory)
      .addChecks(CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(TypeScriptLanguage.KEY)
      .name("ESLint-based TypeScript analysis")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  protected Iterable<InputFile> getInputFiles(SensorContext sensorContext) {
    FileSystem fileSystem = sensorContext.fileSystem();
    FilePredicate mainFilePredicate = filePredicate(fileSystem);
    return fileSystem.inputFiles(mainFilePredicate);
  }

  static FilePredicate filePredicate(FileSystem fileSystem) {
    return fileSystem.predicates().and(
        fileSystem.predicates().hasType(Type.MAIN),
        fileSystem.predicates().hasLanguage(TypeScriptLanguage.KEY));
  }

  @Override
  protected void analyze(InputFile file, SensorContext context) {
    try {
      String fileContent = isSonarLint(context) ? file.contents() : null;
      AnalysisRequest request = new AnalysisRequest(file.absolutePath(), fileContent, rules, tsConfigs(context));
      AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);

      if (response.parsingError != null) {
        processParsingError(context, file, response.parsingError);
        return;
      }

      saveMetrics(file, context, response.metrics);
      saveIssues(file, context, response.issues);
      saveHighlights(file, context, response.highlights);
      saveHighlightedSymbols(file, context, response.highlightedSymbols);
      saveCpd(file, context, response.cpdTokens);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
    }
  }

  private void saveIssues(InputFile file, SensorContext context, Issue[] issues) {
    for (Issue issue : issues) {
      new EslintBasedIssue(issue).saveIssue(context, file, checks);
    }
  }

  private static void saveHighlights(InputFile file, SensorContext context, Highlight[] highlights) {
    NewHighlighting highlighting = context.newHighlighting().onFile(file);
    for (Highlight highlight : highlights) {
      highlighting.highlight(highlight.location.toTextRange(file), TypeOfText.valueOf(highlight.textType));
    }
    highlighting.save();
  }

  private static void saveHighlightedSymbols(InputFile file, SensorContext context, HighlightedSymbol[] highlightedSymbols) {
    NewSymbolTable symbolTable = context.newSymbolTable().onFile(file);
    for (HighlightedSymbol highlightedSymbol : highlightedSymbols) {
      Location declaration = highlightedSymbol.declaration;
      NewSymbol newSymbol = symbolTable.newSymbol(declaration.startLine, declaration.startCol, declaration.endLine, declaration.endCol);
      for (Location reference : highlightedSymbol.references) {
        newSymbol.newReference(reference.startLine, reference.startCol, reference.endLine, reference.endCol);
      }
    }
    symbolTable.save();
  }

  private void saveMetrics(InputFile file, SensorContext context, Metrics metrics) {
    saveMetric(file, context, CoreMetrics.FUNCTIONS, metrics.functions);
    saveMetric(file, context, CoreMetrics.STATEMENTS, metrics.statements);
    saveMetric(file, context, CoreMetrics.CLASSES, metrics.classes);
    saveMetric(file, context, CoreMetrics.NCLOC, metrics.ncloc.length);
    saveMetric(file, context, CoreMetrics.COMMENT_LINES, metrics.commentLines.length);
    saveMetric(file, context, CoreMetrics.COMPLEXITY, metrics.complexity);
    saveMetric(file, context, CoreMetrics.COGNITIVE_COMPLEXITY, metrics.cognitiveComplexity);

    noSonarFilter.noSonarInFile(file, Arrays.stream(metrics.nosonarLines).boxed().collect(Collectors.toSet()));

    FileLinesContext fileLinesContext = fileLinesContextFactory.createFor(file);
    for (int line : metrics.ncloc) {
      fileLinesContext.setIntValue(CoreMetrics.NCLOC_DATA_KEY, line, 1);
    }

    for (int line : metrics.executableLines) {
      fileLinesContext.setIntValue(CoreMetrics.EXECUTABLE_LINES_DATA_KEY, line, 1);
    }

    fileLinesContext.save();
  }

  private static <T extends Serializable> void saveMetric(InputFile file, SensorContext context, Metric<T> metric, T value) {
    context.<T>newMeasure()
      .withValue(value)
      .forMetric(metric)
      .on(file)
      .save();
  }

  private static void saveCpd(InputFile file, SensorContext context, CpdToken[] cpdTokens) {
    NewCpdTokens newCpdTokens = context.newCpdTokens().onFile(file);
    for (CpdToken cpdToken : cpdTokens) {
      newCpdTokens.addToken(cpdToken.location.toTextRange(file), cpdToken.image);
    }
    newCpdTokens.save();
  }

  private List<String> tsConfigs(SensorContext context) throws IOException {
    if (tsconfigs == null) {
      Optional<String> tsConfigProperty = context.config().get(JavaScriptPlugin.TSCONFIG_PATH);
      if (tsConfigProperty.isPresent()) {
        Path tsconfig = Paths.get(tsConfigProperty.get());
        tsconfig = tsconfig.isAbsolute() ? tsconfig : context.fileSystem().baseDir().toPath().resolve(tsconfig);
        if (!tsconfig.toFile().exists()) {
          String msg = format("Provided tsconfig.json path doesn't exist. Path: '%s'", tsconfig);
          LOG.error(msg);
          throw new IllegalStateException(msg);
        }
        tsconfigs = Collections.singletonList(tsconfig.toString());
        LOG.info("Using {} from {} property", tsconfig, JavaScriptPlugin.TSCONFIG_PATH);
      } else {
        tsconfigs = lookupTsConfig(context);
        LOG.info("Found " + tsconfigs.size() + " tsconfig.json file(s): " + tsconfigs);
      }
    }
    return tsconfigs;
  }

  private static List<String> lookupTsConfig(SensorContext context) throws IOException {
    FileSystem fs = context.fileSystem();
    Path baseDir = fs.baseDir().toPath();
    try (Stream<Path> files = Files.walk(baseDir)) {
      return files
        .filter(p -> p.endsWith("tsconfig.json") && !isNodeModulesPath(p))
        .map(p -> p.toAbsolutePath().toString())
        .collect(Collectors.toList());
    }
  }

  private static boolean isNodeModulesPath(Path p) {
    Path nodeModules = Paths.get("node_modules");
    return StreamSupport.stream(p.spliterator(), false).anyMatch(nodeModules::equals);
  }
}
