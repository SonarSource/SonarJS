/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
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
package org.sonar.plugins.javascript;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.google.common.collect.Lists;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.checks.NoSonarFilter;
import org.sonar.api.component.Perspective;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.PersistenceMode;
import org.sonar.api.measures.RangeDistributionBuilder;
import org.sonar.api.resources.File;
import org.sonar.api.resources.Project;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.scan.filesystem.PathResolver;
import org.sonar.api.source.Highlightable;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.javascript.JavaScriptFileScanner;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.ast.visitors.VisitorsBridge;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.metrics.FileLinesVisitor;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.highlighter.JavaScriptHighlighter;
import org.sonar.squidbridge.AstScanner;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.squidbridge.api.CheckMessage;
import org.sonar.squidbridge.api.CodeVisitor;
import org.sonar.squidbridge.api.SourceClass;
import org.sonar.squidbridge.api.SourceCode;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.api.SourceFunction;
import org.sonar.squidbridge.indexer.QueryByParent;
import org.sonar.squidbridge.indexer.QueryByType;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;

public class JavaScriptSquidSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptSquidSensor.class);
  private static final Number[] FUNCTIONS_DISTRIB_BOTTOM_LIMITS = {1, 2, 4, 6, 8, 10, 12, 20, 30};
  private static final Number[] FILES_DISTRIB_BOTTOM_LIMITS = {0, 5, 10, 20, 30, 60, 90};

  private final Checks<CodeVisitor> checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final ResourcePerspectives resourcePerspectives;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final PathResolver pathResolver;

  private SensorContext context;
  private AstScanner<LexerlessGrammar> scanner;

  public JavaScriptSquidSensor(CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
    ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter, PathResolver pathResolver) {
    this.checks = checkFactory
      .<CodeVisitor>create(CheckList.REPOSITORY_KEY)
      .addAnnotatedChecks(CheckList.getChecks());
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.resourcePerspectives = resourcePerspectives;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.pathResolver = pathResolver;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScript.KEY));
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    this.context = context;

    List<CodeVisitor> astNodeVisitors = Lists.newArrayList();
    List<JavaScriptFileScanner> treeVisitors = Lists.newArrayList();

    for (CodeVisitor visitor : checks.all()) {
      if (visitor instanceof JavaScriptFileScanner) {
        treeVisitors.add((JavaScriptFileScanner) visitor);
      } else {
        astNodeVisitors.add(visitor);
      }
    }

    astNodeVisitors.add(new VisitorsBridge(treeVisitors));
    astNodeVisitors.add(new FileLinesVisitor(fileLinesContextFactory, fileSystem, pathResolver));

    scanner = JavaScriptAstScanner.create(createConfiguration(), astNodeVisitors.toArray(new SquidAstVisitor[astNodeVisitors.size()]));
    scanner.scanFiles(Lists.newArrayList(fileSystem.files(mainFilePredicate)));

    Collection<SourceCode> squidSourceFiles = scanner.getIndex().search(new QueryByType(SourceFile.class));
    save(squidSourceFiles);

    highlight();
  }

  private void highlight() {
    JavaScriptHighlighter highlighter = new JavaScriptHighlighter(createConfiguration());
    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)){
      highlighter.highlight(perspective(Highlightable.class, inputFile), inputFile.file());
    }
  }

  <P extends Perspective<?>> P perspective(Class<P> clazz, @Nullable InputFile file) {
    if (file == null) {
      throw new IllegalArgumentException("Cannot get " + clazz.getCanonicalName() + "for a null file");
    }
    P result = resourcePerspectives.as(clazz, file);
    if (result == null) {
      throw new IllegalStateException("Could not get " + clazz.getCanonicalName() + " for " + file);
    }
    return result;
  }

  private EcmaScriptConfiguration createConfiguration() {
    return new EcmaScriptConfiguration(fileSystem.encoding());
  }

  private void save(Collection<SourceCode> squidSourceFiles) {
    for (SourceCode squidSourceFile : squidSourceFiles) {
      SourceFile squidFile = (SourceFile) squidSourceFile;

      File sonarFile = context.getResource(File.create(pathResolver.relativePath(fileSystem.baseDir(), new java.io.File(squidFile.getKey()))));

      if (sonarFile != null) {
        noSonarFilter.addResource(sonarFile, squidFile.getNoSonarTagLines());
        saveClassComplexity(sonarFile, squidFile);
        saveFilesComplexityDistribution(sonarFile, squidFile);
        saveFunctionsComplexityAndDistribution(sonarFile, squidFile);
        saveMeasures(sonarFile, squidFile);
        saveIssues(sonarFile, squidFile);

      } else {
        LOG.warn("Cannot save analysis information for file {}. Unable to retrieve the associated sonar resource.", squidFile.getKey());
      }
    }
  }

  private void saveMeasures(File sonarFile, SourceFile squidFile) {
    context.saveMeasure(sonarFile, CoreMetrics.LINES, squidFile.getDouble(EcmaScriptMetric.LINES));
    context.saveMeasure(sonarFile, CoreMetrics.NCLOC, squidFile.getDouble(EcmaScriptMetric.LINES_OF_CODE));
    context.saveMeasure(sonarFile, CoreMetrics.CLASSES, squidFile.getDouble(EcmaScriptMetric.CLASSES));
    context.saveMeasure(sonarFile, CoreMetrics.FUNCTIONS, squidFile.getDouble(EcmaScriptMetric.FUNCTIONS));
    context.saveMeasure(sonarFile, CoreMetrics.ACCESSORS, squidFile.getDouble(EcmaScriptMetric.ACCESSORS));
    context.saveMeasure(sonarFile, CoreMetrics.STATEMENTS, squidFile.getDouble(EcmaScriptMetric.STATEMENTS));
    context.saveMeasure(sonarFile, CoreMetrics.COMPLEXITY, squidFile.getDouble(EcmaScriptMetric.COMPLEXITY));
    context.saveMeasure(sonarFile, CoreMetrics.COMMENT_LINES, squidFile.getDouble(EcmaScriptMetric.COMMENT_LINES));
  }

  private void saveClassComplexity(org.sonar.api.resources.File sonarFile, SourceFile squidFile) {
    double complexityInClasses = 0;
    Set<SourceCode> children = squidFile.getChildren();

    if (children != null) {
      for (SourceCode sourceCode : squidFile.getChildren()) {
        if (sourceCode.isType(SourceClass.class)) {
          complexityInClasses += sourceCode.getDouble(EcmaScriptMetric.COMPLEXITY);
        }
      }
    }
    context.saveMeasure(sonarFile, CoreMetrics.COMPLEXITY_IN_CLASSES, complexityInClasses);
  }

  private void saveFunctionsComplexityAndDistribution(File sonarFile, SourceFile squidFile) {
    Collection<SourceCode> squidFunctionsInFile = scanner.getIndex().search(new QueryByParent(squidFile), new QueryByType(SourceFunction.class));
    RangeDistributionBuilder complexityDistribution = new RangeDistributionBuilder(CoreMetrics.FUNCTION_COMPLEXITY_DISTRIBUTION, FUNCTIONS_DISTRIB_BOTTOM_LIMITS);
    double complexityInFunction = 0;
    for (SourceCode squidFunction : squidFunctionsInFile) {
      double functionComplexity = squidFunction.getDouble(EcmaScriptMetric.COMPLEXITY);
      complexityDistribution.add(functionComplexity);
      complexityInFunction += functionComplexity;
    }
    context.saveMeasure(sonarFile, complexityDistribution.build().setPersistenceMode(PersistenceMode.MEMORY));
    context.saveMeasure(sonarFile, CoreMetrics.COMPLEXITY_IN_FUNCTIONS, complexityInFunction);
 }

  private void saveFilesComplexityDistribution(File sonarFile, SourceFile squidFile) {
    RangeDistributionBuilder complexityDistribution = new RangeDistributionBuilder(CoreMetrics.FILE_COMPLEXITY_DISTRIBUTION, FILES_DISTRIB_BOTTOM_LIMITS);
    complexityDistribution.add(squidFile.getDouble(EcmaScriptMetric.COMPLEXITY));
    context.saveMeasure(sonarFile, complexityDistribution.build().setPersistenceMode(PersistenceMode.MEMORY));
  }

  private void saveIssues(File sonarFile, SourceFile squidFile) {
    Collection<CheckMessage> messages = squidFile.getCheckMessages();
    if (messages != null) {

      for (CheckMessage message : messages) {
        RuleKey ruleKey = checks.ruleKey((CodeVisitor) message.getCheck());
        Issuable issuable = resourcePerspectives.as(Issuable.class, sonarFile);

        if (issuable != null) {
          Issue issue = issuable.newIssueBuilder()
            .ruleKey(ruleKey)
            .line(message.getLine())
            .message(message.getText(Locale.ENGLISH))
            .build();
          issuable.addIssue(issue);
        }
      }
    }
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
