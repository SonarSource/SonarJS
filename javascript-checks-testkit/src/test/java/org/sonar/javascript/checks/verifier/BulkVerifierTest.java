/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.checks.verifier;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

import static org.assertj.core.api.Assertions.assertThat;

public class BulkVerifierTest {

  private File testFolder;
  private DummyIssueCollector collector;
  private BulkVerifier verifier;

  @Before
  public void setUp() throws Exception {
    testFolder = new File("src/test/resources/bulk-verifier-test");
    collector = new DummyIssueCollector();
    verifier = new BulkVerifier(SampleCheck.class, collector);
  }

  @Test
  public void appliesRuleToTargetFolderFiles() throws Exception {
    verifier.scanDirectory(testFolder);
    assertThat(collector.collectedIssues).contains("a = 0", "b = 0", "c = 1", "d = 2");
    assertThat(collector.collectedIssues).doesNotContain("declaredNowhere = 0");
  }

  @Test
  public void ignoresNonJavascriptFiles() throws Exception {
    verifier.scanDirectory(testFolder);
    assertThat(collector.collectedIssues).doesNotContain("inAJsxFile = 1");
  }

  private static class SampleCheck extends DoubleDispatchVisitorCheck {
    public SampleCheck() {
    }

    @Override
    public void visitVariableDeclaration(VariableDeclarationTree tree) {
      addIssue(tree, tree.variables().get(0).toString().trim());
      super.visitVariableDeclaration(tree);
    }
  }

  private static class DummyIssueCollector implements IssueCollector {
    public List<String> collectedIssues = Collections.synchronizedList(new ArrayList<>());

    @Override
    public void writeIssues(Iterator<Issue> issues, File file) {
      while (issues.hasNext()) {
        collectedIssues.add(((PreciseIssue) issues.next()).primaryLocation().message());
      }
    }

    @Override
    public void writeSummary() {
    }
  }
}
