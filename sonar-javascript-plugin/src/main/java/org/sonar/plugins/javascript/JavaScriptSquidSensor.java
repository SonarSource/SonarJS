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
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.component.Perspective;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Project;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.javascript.highlighter.HighlighterVisitor;
import org.sonar.javascript.highlighter.SourceFileOffsets;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.metrics.MetricsVisitor;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.squidbridge.ProgressReport;
import org.sonar.squidbridge.api.AnalysisException;

import javax.annotation.Nullable;

import java.util.Collection;
import java.util.List;
import java.util.concurrent.TimeUnit;

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
  private final Settings settings;
  private final ActionParser<Tree> parser;
  // parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
  private RuleKey parsingErrorRuleKey = null;

  public JavaScriptSquidSensor(CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
                               ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter, Settings settings) {
    this(checkFactory, fileLinesContextFactory, resourcePerspectives, fileSystem, noSonarFilter, settings, null);
  }

  public JavaScriptSquidSensor(CheckFactory checkFactory, FileLinesContextFactory fileLinesContextFactory,
                               ResourcePerspectives resourcePerspectives, FileSystem fileSystem, NoSonarFilter noSonarFilter,
                               Settings settings, @Nullable CustomJavaScriptRulesDefinition[] customRulesDefinition) {

    this.checks = JavaScriptChecks.createJavaScriptCheck(checkFactory)
        .addChecks(CheckList.REPOSITORY_KEY, CheckList.getChecks())
        .addCustomChecks(customRulesDefinition);
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.resourcePerspectives = resourcePerspectives;
    this.fileSystem = fileSystem;
    this.noSonarFilter = noSonarFilter;
    this.mainFilePredicate = fileSystem.predicates().and(
        fileSystem.predicates().hasType(InputFile.Type.MAIN),
        fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    this.settings = settings;
    this.parser = JavaScriptParserBuilder.createParser(fileSystem.encoding());
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    List<JavaScriptCheck> treeVisitors = Lists.newArrayList();

    treeVisitors.add(new MetricsVisitor(fileSystem, context, noSonarFilter, settings.getBoolean(JavaScriptPlugin.IGNORE_HEADER_COMMENTS), fileLinesContextFactory));
    treeVisitors.add(new HighlighterVisitor(resourcePerspectives, fileSystem));
    treeVisitors.addAll(checks.all());

    for (JavaScriptCheck check : treeVisitors) {
      if (check instanceof ParsingErrorCheck) {
        parsingErrorRuleKey = checks.ruleKeyFor(check);
        break;
      }
    }

    ProgressReport progressReport = new ProgressReport("Report about progress of Javascript analyzer", TimeUnit.SECONDS.toMillis(10));
    progressReport.start(Lists.newArrayList(fileSystem.files(mainFilePredicate)));

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      analyse(inputFile, treeVisitors);
      progressReport.nextFile();
    }

    progressReport.stop();
  }

  private void analyse(InputFile inputFile, List<JavaScriptCheck> visitors) {
    Issuable issuable = perspective(Issuable.class, inputFile);
    ScriptTree scriptTree;

    try {
      scriptTree = (ScriptTree) parser.parse(new java.io.File(inputFile.absolutePath()));
      scanFile(inputFile, visitors, issuable, scriptTree);

    } catch (RecognitionException e) {
      LOG.error("Unable to parse file: " + inputFile.absolutePath());
      LOG.error(e.getMessage());
      processRecognitionException(e, issuable);

    } catch (Exception e) {
      throw new AnalysisException("Unable to parse file: " + inputFile.absolutePath(), e);
    }

  }

  private void processRecognitionException(RecognitionException e, Issuable issuable) {
    if (parsingErrorRuleKey != null) {
      issuable.addIssue(issuable.newIssueBuilder()
              .ruleKey(parsingErrorRuleKey)
              .line(e.getLine())
              .message(e.getMessage())
              .build()
      );
    }
  }

  private void scanFile(InputFile inputFile, List<JavaScriptCheck> visitors, Issuable issuable, ScriptTree scriptTree) {
    SymbolModelImpl symbolModel = SymbolModelImpl.create(
        scriptTree,
        perspective(Symbolizable.class, inputFile),
        new SourceFileOffsets(inputFile.file(), fileSystem.encoding()), settings
    );

    for (JavaScriptCheck visitor : visitors) {
      if (visitor instanceof CharsetAwareVisitor) {
        ((CharsetAwareVisitor) visitor).setCharset(fileSystem.encoding());
      }

      visitor.scanFile(new JavaScriptCheckContext(
          scriptTree,
          issuable,
          inputFile.file(),
          symbolModel,
          settings,
          checks,
          new ComplexityVisitor()
      ));

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

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
