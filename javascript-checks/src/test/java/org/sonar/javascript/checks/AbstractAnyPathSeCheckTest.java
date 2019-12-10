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
package org.sonar.javascript.checks;

import java.io.File;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.javascript.checks.verifier.JavaScriptCheckVerifier;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

public class AbstractAnyPathSeCheckTest {
  
  private final JavaScriptCheck check = new DummyCheck();

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  @Test
  @Ignore
  public void test() {
    JavaScriptCheckVerifier.verify(check,
      new File("src/test/resources/checks/abstractAnyPathSe1.js"));
  }

  @Test
  @Ignore
  public void test_should_raise_exception() {
    thrown.expect(UnsupportedOperationException.class);
    JavaScriptCheckVerifier.verify(check,
      new File("src/test/resources/checks/abstractAnyPathSe2.js"));
  }

  @Test
  @Ignore
  public void test_should_also_raise_exception() {
    thrown.expect(UnsupportedOperationException.class);
    JavaScriptCheckVerifier.verify(check,
      new File("src/test/resources/checks/abstractAnyPathSe3.js"));
  }

  private static class DummyCheck extends AbstractAnyPathSeCheck {

    @Override
    public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
      if (element.is(Kind.DOT_MEMBER_EXPRESSION)) {
        addUniqueIssue(element, "DOT_MEMBER_EXPRESSION");
      } else if (element.is(Kind.OBJECT_LITERAL)) {
        addUniqueIssue(element, "OBJECT_LITERAL", element);
      } else if (element.is(Kind.BITWISE_AND)) {
        addUniqueIssue(element, "BITWISE_AND", new IssueLocation(element));
      } else if (element.is(Kind.ARRAY_LITERAL)) {
        // throws an exception
        addIssue(element, "ARRAY_LITERAL");
      } else if (element.is(Kind.BITWISE_OR)) {
        // throws an exception
        addIssue(new FileIssue(null, null));
      }
    }

  }

}
