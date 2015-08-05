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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.checks.NoSonarFilter;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issue;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.File;
import org.sonar.api.resources.Project;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.scan.filesystem.PathResolver;
import org.sonar.api.source.Highlightable;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.JavaScriptAstScanner;
import org.sonar.javascript.api.EcmaScriptMetric;
import org.sonar.javascript.ast.visitors.VisitorsBridge;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.highlighter.JavaScriptHighlighter;
import org.sonar.javascript.metrics.FileLinesVisitor;
import org.sonar.javascript.metrics.MetricsVisitor;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.squidbridge.AstScanner;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.squidbridge.api.CheckMessage;
import org.sonar.squidbridge.api.CodeVisitor;
import org.sonar.squidbridge.api.SourceCode;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.squidbridge.indexer.QueryByType;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

public class JavaScriptSquidSensor implements Sensor {


  @DependedUpon
  public Collection<Metric> generatesNCLOCMetric() {
    return ImmutableList.<Metric>of(CoreMetrics.NCLOC, CoreMetrics.NCLOC_DATA);
  }

  private static final Logger LOG = LoggerFactory.getLogger(JavaScriptSquidSensor.class);

  private final JavaScriptChecks checks;
  private final FileLinesContextFactory fileLinesContextFactory;
  private final ResourcePerspectives resourcePerspectives;
  private final FileSystem fileSystem;
  private final NoSonarFilter noSonarFilter;
  private final FilePredicate mainFilePredicate;
  private final PathResolver pathResolver;
  private final Settings settings;

  private SensorContext context;
  private AstScanner<LexerlessGrammar> scanner;

  public JavaScriptSquidSensor(CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
                               ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter,
                               PathResolver pathResolver, Settings settings, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition) {

    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
      .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks())
      .addCustomChecks(customRulesDefinition);
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.resourcePerspectives = resourcePerspectives;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.pathResolver = pathResolver;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScript.KEY));
    this.settings = settings;
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    this.context = context;

    List<CodeVisitor> astNodeVisitors = Lists.newArrayList();
    List<JavaScriptCheck> treeVisitors = Lists.newArrayList();

    for (CodeVisitor visitor : checks.all()) {
      if (visitor instanceof JavaScriptCheck) {
        treeVisitors.add((JavaScriptCheck) visitor);
      } else {
        astNodeVisitors.add(visitor);
      }
    }

    treeVisitors.add(new MetricsVisitor(fileSystem, context));
    astNodeVisitors.add(new VisitorsBridge(treeVisitors, resourcePerspectives, fileSystem, settings));
    astNodeVisitors.add(new FileLinesVisitor(fileLinesContextFactory, fileSystem, pathResolver));

    scanner = JavaScriptAstScanner.create(createConfiguration(), astNodeVisitors.toArray(new SquidAstVisitor[astNodeVisitors.size()]));
    scanner.scanFiles(Lists.newArrayList(fileSystem.files(mainFilePredicate)));

    Collection<SourceCode> squidSourceFiles = scanner.getIndex().search(new QueryByType(SourceFile.class));
    save(squidSourceFiles);

    highlight();
  }

  private void highlight() {
    JavaScriptHighlighter highlighter = new JavaScriptHighlighter(createConfiguration());

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      Highlightable perspective = resourcePerspectives.as(Highlightable.class, inputFile);

      if (perspective != null) {
        highlighter.highlight(perspective, inputFile.file());

      } else {
        LOG.warn("Could not get " + Highlightable.class.getCanonicalName() + " for " + inputFile.file());
      }
    }
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
        saveMeasures(sonarFile, squidFile);
        saveIssues(sonarFile, squidFile);

      } else {
        LOG.warn("Cannot save analysis information for file {}. Unable to retrieve the associated sonar resource.", squidFile.getKey());
      }
    }
  }

  private void saveMeasures(File sonarFile, SourceFile squidFile) {
    context.saveMeasure(sonarFile, CoreMetrics.LINES, squidFile.getDouble(EcmaScriptMetric.LINES));
    context.saveMeasure(sonarFile, CoreMetrics.COMMENT_LINES, squidFile.getDouble(EcmaScriptMetric.COMMENT_LINES));
  }

  private void saveIssues(File sonarFile, SourceFile squidFile) {
    Collection<CheckMessage> messages = squidFile.getCheckMessages();
    if (messages != null) {

      for (CheckMessage message : messages) {
        RuleKey ruleKey = checks.ruleKeyFor((CodeVisitor) message.getCheck());
        Issuable issuable = resourcePerspectives.as(Issuable.class, sonarFile);

        if (issuable != null && ruleKey != null) {
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
