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

import com.google.common.base.Preconditions;
import java.io.File;
import java.lang.reflect.Method;
import java.util.List;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.issue.Issuable;
import org.sonar.api.issue.Issuable.IssueBuilder;
import org.sonar.api.rule.RuleKey;
import org.sonar.javascript.issues.PreciseIssue;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

public class JavaScriptCheckContext implements TreeVisitorContext {

  private static final boolean IS_SONARQUBE_52_OR_LATER = isSonarQube52OrLater();

  private final SensorContext sensorContext;
  private final ScriptTree tree;
  private final InputFile inputFile;
  private final SymbolModel symbolModel;
  private final Settings settings;
  private final ComplexityVisitor complexity;
  private final Issuable issuable;
  private final JavaScriptChecks checks;

  public JavaScriptCheckContext(
    SensorContext sensorContext, ScriptTree tree, Issuable issuable, InputFile inputFile, SymbolModel symbolModel,
    Settings settings, JavaScriptChecks checks, ComplexityVisitor complexityVisitor
  ) {
    this.sensorContext = sensorContext;
    this.tree = tree;
    this.inputFile = inputFile;
    this.symbolModel = symbolModel;
    this.settings = settings;
    this.complexity = complexityVisitor;
    this.issuable = issuable;
    this.checks = checks;
  }

  @Override
  public ScriptTree getTopTree() {
    return tree;
  }

  @Override
  public void addIssue(JavaScriptCheck check, Tree tree, String message) {
    commonAddIssue(check, getLine(tree), message, -1);
  }

  @Override
  public void addIssue(JavaScriptCheck check, int line, String message) {
    commonAddIssue(check, line, message, -1);
  }

  @Override
  public void addFileIssue(JavaScriptCheck check, String message) {
    commonAddIssue(check, -1, message, -1);
  }

  @Override
  public void addIssue(JavaScriptCheck check, Tree tree, String message, double cost) {
    commonAddIssue(check, getLine(tree), message, cost);
  }

  @Override
  public void addIssue(JavaScriptCheck check, int line, String message, double cost) {
    commonAddIssue(check, line, message, cost);
  }

  @Override
  public void addIssue(JavaScriptCheck check, IssueLocation location, List<IssueLocation> secondaryLocations, Double cost) {
    if (IS_SONARQUBE_52_OR_LATER) {
      RuleKey ruleKey = ruleKey(check);
      PreciseIssue.save(sensorContext, inputFile, ruleKey, location, secondaryLocations, cost);
    } else {
      commonAddIssue(check, location.startLine(), location.message(), cost == null ? -1 : cost);
    }
  }

  @Override
  public File getFile() {
    return inputFile.file();
  }

  /**
   * Cost is set if <code>cost<code/> is more than zero.
   */
  private void commonAddIssue(JavaScriptCheck check, int line, String message, double cost) {
    Preconditions.checkNotNull(message);

    RuleKey ruleKey = ruleKey(check);

    IssueBuilder issueBuilder = issuable
      .newIssueBuilder()
      .ruleKey(ruleKey)
      .message(message);

    if (line > 0) {
      issueBuilder.line(line);
    }
    if (cost > 0) {
      issueBuilder.effortToFix(cost);
    }

    issuable.addIssue(issueBuilder.build());
  }

  private RuleKey ruleKey(JavaScriptCheck check) {
    Preconditions.checkNotNull(check);
    RuleKey ruleKey = checks.ruleKeyFor(check);
    if (ruleKey == null) {
      throw new IllegalStateException("No rule key found for a rule");
    }
    return ruleKey;
  }

  private static int getLine(Tree tree) {
    return ((JavaScriptTree) tree).getLine();
  }

  @Override
  public SymbolModel getSymbolModel() {
    return symbolModel;
  }

  @Override
  public String[] getPropertyValues(String name) {
    return settings.getStringArray(name);
  }

  @Override
  public int getComplexity(Tree tree) {
    return complexity.getComplexity(tree);
  }

  private static boolean isSonarQube52OrLater() {
    for (Method method : Issuable.IssueBuilder.class.getMethods()) {
      if ("newLocation".equals(method.getName())) {
        return true;
      }
    }
    return false;
  }

}
