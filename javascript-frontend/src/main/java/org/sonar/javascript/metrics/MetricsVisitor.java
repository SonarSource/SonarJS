/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.metrics;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.ce.measure.RangeDistributionBuilder;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.measures.Metric;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

public class MetricsVisitor extends SubscriptionVisitor {

  private static final Number[] LIMITS_COMPLEXITY_FUNCTIONS = {1, 2, 4, 6, 8, 10, 12, 20, 30};
  private static final Number[] FILES_DISTRIB_BOTTOM_LIMITS = {0, 5, 10, 20, 30, 60, 90};

  private static final Kind[] FUNCTION_NODES = {
    Kind.FUNCTION_DECLARATION,
    Kind.FUNCTION_EXPRESSION,
    Kind.METHOD,
    Kind.GENERATOR_METHOD,
    Kind.GENERATOR_FUNCTION_EXPRESSION,
    Kind.GENERATOR_DECLARATION
  };

  private static final Kind[] CLASS_NODES = {
    Kind.CLASS_DECLARATION,
    Kind.CLASS_EXPRESSION
  };

  private final FileSystem fs;
  private final SensorContext sensorContext;
  private InputFile inputFile;
  private NoSonarFilter noSonarFilter;
  private final Boolean ignoreHeaderComments;
  private FileLinesContextFactory fileLinesContextFactory;

  private int classComplexity;
  private int functionComplexity;
  private RangeDistributionBuilder functionComplexityDistribution;
  private RangeDistributionBuilder fileComplexityDistribution;

  private ComplexityVisitor complexityVisitor;

  public MetricsVisitor(FileSystem fs, SensorContext context, NoSonarFilter noSonarFilter, Boolean ignoreHeaderComments, FileLinesContextFactory fileLinesContextFactory) {
    this.fs = fs;
    this.sensorContext = context;
    this.noSonarFilter = noSonarFilter;
    this.ignoreHeaderComments = ignoreHeaderComments;
    this.fileLinesContextFactory = fileLinesContextFactory;
    this.complexityVisitor = new ComplexityVisitor();
  }

  @Override
  public List<Kind> nodesToVisit() {
    List<Kind> result = new ArrayList<>(Arrays.asList(FUNCTION_NODES));
    result.addAll(Arrays.asList(CLASS_NODES));
    return result;
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    saveComplexityMetrics(getContext());
    saveCounterMetrics(getContext());
    saveLineMetrics(getContext());
  }

  @Override
  public void visitNode(Tree tree) {
    if (tree.is(CLASS_NODES)) {
      classComplexity += complexityVisitor.getComplexity(tree);

    } else if (tree.is(FUNCTION_NODES)) {
      int currentFunctionComplexity = complexityVisitor.getComplexity(tree);
      this.functionComplexity += currentFunctionComplexity;
      functionComplexityDistribution.add(currentFunctionComplexity);
    }
  }



  @Override
  public void visitFile(Tree scriptTree) {
    this.inputFile = fs.inputFile(fs.predicates().is(getContext().getFile()));
    init();
  }



  private void init() {
    classComplexity = 0;
    functionComplexity = 0;
    functionComplexityDistribution = new RangeDistributionBuilder(LIMITS_COMPLEXITY_FUNCTIONS);
    fileComplexityDistribution = new RangeDistributionBuilder(FILES_DISTRIB_BOTTOM_LIMITS);
  }

  private void saveCounterMetrics(TreeVisitorContext context) {
    CounterVisitor counter = new CounterVisitor(context.getTopTree());
    saveMetricOnFile(CoreMetrics.FUNCTIONS, counter.getFunctionNumber());
    saveMetricOnFile(CoreMetrics.STATEMENTS, counter.getStatementsNumber());
    saveMetricOnFile(CoreMetrics.ACCESSORS, counter.getAccessorsNumber());
    saveMetricOnFile(CoreMetrics.CLASSES, counter.getClassNumber());
  }

  private void saveComplexityMetrics(TreeVisitorContext context) {
    int fileComplexity = complexityVisitor.getComplexity(context.getTopTree());

    saveMetricOnFile(CoreMetrics.COMPLEXITY, fileComplexity);
    saveMetricOnFile(CoreMetrics.COMPLEXITY_IN_CLASSES, classComplexity);
    saveMetricOnFile(CoreMetrics.COMPLEXITY_IN_FUNCTIONS, functionComplexity);

    sensorContext.<String>newMeasure()
      .on(inputFile)
      .forMetric(CoreMetrics.FUNCTION_COMPLEXITY_DISTRIBUTION)
      .withValue(functionComplexityDistribution.build())
      .save();

    fileComplexityDistribution.add(fileComplexity);

    sensorContext.<String>newMeasure()
      .on(inputFile)
      .forMetric(CoreMetrics.FILE_COMPLEXITY_DISTRIBUTION)
      .withValue(fileComplexityDistribution.build())
      .save();
  }

  private void saveLineMetrics(TreeVisitorContext context) {
    LineVisitor lineVisitor = new LineVisitor(context.getTopTree());
    int linesNumber = lineVisitor.getLinesNumber();
    Set<Integer> linesOfCode = lineVisitor.getLinesOfCode();

    saveMetricOnFile(CoreMetrics.NCLOC, lineVisitor.getLinesOfCodeNumber());
    saveMetricOnFile(CoreMetrics.LINES, linesNumber);

    CommentLineVisitor commentVisitor = new CommentLineVisitor(context.getTopTree(), ignoreHeaderComments);
    Set<Integer> commentLines = commentVisitor.getCommentLines();

    saveMetricOnFile(CoreMetrics.COMMENT_LINES, commentVisitor.getCommentLineNumber());
    noSonarFilter.noSonarInFile(inputFile, commentVisitor.noSonarLines());

    FileLinesContext fileLinesContext = fileLinesContextFactory.createFor(inputFile);
    for (int line = 1; line <= linesNumber; line++) {
      fileLinesContext.setIntValue(CoreMetrics.NCLOC_DATA_KEY, line, linesOfCode.contains(line) ? 1 : 0);
      fileLinesContext.setIntValue(CoreMetrics.COMMENT_LINES_DATA_KEY, line, commentLines.contains(line) ? 1 : 0);
    }
    fileLinesContext.save();
  }

  private <T extends Serializable> void saveMetricOnFile(Metric metric, T value) {
    sensorContext.<T>newMeasure()
      .withValue(value)
      .forMetric(metric)
      .on(inputFile)
      .save();
  }

  public static Kind[] getClassNodes() {
    return CLASS_NODES;
  }

  public static Kind[] getFunctionNodes() {
    return FUNCTION_NODES;
  }

}
