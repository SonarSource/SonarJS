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
package org.sonar.javascript.metrics;

import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Metric;
import org.sonar.api.measures.PersistenceMode;
import org.sonar.api.measures.RangeDistributionBuilder;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.ast.visitors.SubscriptionAstTreeVisitor;
import org.sonar.plugins.javascript.api.AstTreeVisitorContext;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class MetricsVisitor extends SubscriptionAstTreeVisitor {

  private static final Number[] LIMITS_COMPLEXITY_FUNCTIONS = {1, 2, 4, 6, 8, 10, 12, 20, 30};
  private static final Number[] FILES_DISTRIB_BOTTOM_LIMITS = {0, 5, 10, 20, 30, 60, 90};

  public static final Kind[] FUNCTION_NODES = {
      Kind.FUNCTION_DECLARATION,
      Kind.FUNCTION_EXPRESSION,
      Kind.METHOD,
      Kind.GENERATOR_METHOD,
      Kind.GENERATOR_FUNCTION_EXPRESSION,
      Kind.GENERATOR_DECLARATION
  };

  public static final Kind[] CLASS_NODES = {
      Kind.CLASS_DECLARATION,
      Kind.CLASS_EXPRESSION
  };

  private final FileSystem fs;
  private final SensorContext sensorContext;
  private InputFile inputFile;
  private NoSonarFilter noSonarFilter;
  private EcmaScriptConfiguration configuration;

  private int classComplexity;
  private int functionComplexity;
  private RangeDistributionBuilder functionComplexityDistribution;
  private RangeDistributionBuilder fileComplexityDistribution = new RangeDistributionBuilder(CoreMetrics.FILE_COMPLEXITY_DISTRIBUTION, FILES_DISTRIB_BOTTOM_LIMITS);

  public MetricsVisitor(FileSystem fs, SensorContext context, NoSonarFilter noSonarFilter, EcmaScriptConfiguration configuration) {
    this.fs = fs;
    this.sensorContext = context;
    this.noSonarFilter = noSonarFilter;
    this.configuration = configuration;
  }

  @Override
  public List<Kind> nodesToVisit() {
    List<Kind> result = new ArrayList<>(Arrays.asList(FUNCTION_NODES));
    result.addAll(Arrays.asList(CLASS_NODES));
    return result;
  }

  @Override
  public void scanFile(AstTreeVisitorContext context) {
    this.inputFile = fs.inputFile(fs.predicates().is(context.getFile()));
    init();

    super.scanFile(context);

    saveComplexityMetrics(context);
    saveCounterMetrics(context);
    saveLineMetrics(context);
  }

  private void init() {
    classComplexity = 0;
    functionComplexity = 0;
    functionComplexityDistribution = new RangeDistributionBuilder(CoreMetrics.FUNCTION_COMPLEXITY_DISTRIBUTION, LIMITS_COMPLEXITY_FUNCTIONS);
  }

  private void saveCounterMetrics(AstTreeVisitorContext context) {
    CounterVisitor counter = new CounterVisitor(context.getTopTree());
    saveMetricOnFile(CoreMetrics.FUNCTIONS, counter.getFunctionNumber());
    saveMetricOnFile(CoreMetrics.STATEMENTS, counter.getStatementsNumber());
    saveMetricOnFile(CoreMetrics.ACCESSORS, counter.getAccessorsNumber());
    saveMetricOnFile(CoreMetrics.CLASSES, counter.getClassNumber());
  }

  private void saveComplexityMetrics(AstTreeVisitorContext context) {
    int fileComplexity = context.getComplexity(context.getTopTree());

    saveMetricOnFile(CoreMetrics.COMPLEXITY, fileComplexity);
    saveMetricOnFile(CoreMetrics.COMPLEXITY_IN_CLASSES, classComplexity);
    saveMetricOnFile(CoreMetrics.COMPLEXITY_IN_FUNCTIONS, functionComplexity);

    sensorContext.saveMeasure(inputFile, functionComplexityDistribution.build(true).setPersistenceMode(PersistenceMode.MEMORY));

    fileComplexityDistribution.add(fileComplexity);
    sensorContext.saveMeasure(inputFile, fileComplexityDistribution.build().setPersistenceMode(PersistenceMode.MEMORY));
  }

  private void saveLineMetrics(AstTreeVisitorContext context) {
    LineVisitor lineVisitor = new LineVisitor(context.getTopTree());
    saveMetricOnFile(CoreMetrics.NCLOC, lineVisitor.getLinesOfCodeNumber());
    saveMetricOnFile(CoreMetrics.LINES, lineVisitor.getLinesNumber());

    CommentLineVisitor commentVisitor = new CommentLineVisitor(context.getTopTree(), configuration.getIgnoreHeaderComments());
    saveMetricOnFile(CoreMetrics.COMMENT_LINES, commentVisitor.getCommentLineNumber());
    noSonarFilter.addComponent(sensorContext.getResource(inputFile).getEffectiveKey(), commentVisitor.noSonarLines());
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(CLASS_NODES)) {
      classComplexity += getContext().getComplexity(tree);

    } else if (tree.is(FUNCTION_NODES)) {
      int functionComplexity = getContext().getComplexity(tree);
      this.functionComplexity += functionComplexity;
      functionComplexityDistribution.add(functionComplexity);
    }
  }

  private void saveMetricOnFile(Metric metric, double value) {
    sensorContext.saveMeasure(inputFile, metric, value);
  }

}
