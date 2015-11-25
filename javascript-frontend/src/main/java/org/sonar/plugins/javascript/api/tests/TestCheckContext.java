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
package org.sonar.plugins.javascript.api.tests;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.typed.ActionParser;
import java.io.File;
import java.util.LinkedList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.config.Settings;
import org.sonar.javascript.metrics.ComplexityVisitor;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.SymbolModelImpl;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;
import org.sonar.squidbridge.api.CheckMessage;

public class TestCheckContext implements TreeVisitorContext {

  private static final Logger LOG = LoggerFactory.getLogger(TestCheckContext.class);
  protected static final ActionParser<Tree> p = JavaScriptParserBuilder.createParser(Charsets.UTF_8);

  private final File file;
  private final ComplexityVisitor complexity;
  private final Settings settings;

  private ScriptTree tree = null;
  private SymbolModel symbolModel = null;

  List<CheckMessage> issues = new LinkedList<>();

  public TestCheckContext(File file, Settings settings, JavaScriptCheck check) {
    this.file = file;
    this.complexity = new ComplexityVisitor();
    this.settings = settings;

    try {
      this.tree = (ScriptTree) p.parse(file);
      this.symbolModel = SymbolModelImpl.create(tree, null, null);

    } catch (RecognitionException e) {
      LOG.error("Unable to parse file: " + file.getAbsolutePath());
      LOG.error(e.getMessage());

      if ("ParsingErrorCheck".equals(check.getClass().getSimpleName())) {
        this.addIssue(null, e.getLine(), e.getMessage());
      }
    }

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
    throw new UnsupportedOperationException("To test rules which provide 'secondary locations' use JavaScriptCheckVerifier#verify()");
  }

  @Override
  public File getFile() {
    return file;
  }

  private void commonAddIssue(JavaScriptCheck check, int line, String message, double cost) {
    CheckMessage issue = new CheckMessage(check, message);
    if (cost >= 0) {
      issue.setCost(cost);
    }
    if (line > 0) {
      issue.setLine(line);
    }
    issues.add(issue);
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

  public List<CheckMessage> getIssues() {
    return issues;
  }

}
