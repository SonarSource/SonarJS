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
package org.sonar.javascript.checks;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

import com.google.common.io.Files;

public class JavaScriptCheckVerifierTest {

  @Rule
  public TemporaryFolder folder = new TemporaryFolder();

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  @Test
  public void no_issue() throws Exception {
    check("foo; // OK");
  }
  
  @Test
  public void same_issues() throws Exception {
    check(
      "foo(); // Noncompliant \n" +
      "bar(); // OK", 
      Issue.create("msg1", 1));
  }

  @Test
  public void unexpected_issue() throws Exception {
    expect("Unexpected issue at line 2");
    check(
      "foo(); // Noncompliant \n" +
      "bar(); // OK", 
      Issue.create("msg1", 1), Issue.create("msg1", 2));
  }
  
  @Test
  public void missing_issue() throws Exception {
    expect("Missing issue at line 2");
    check(
      "foo(); // Noncompliant \n" +
      "bar(); // Noncompliant",
      Issue.create("msg1", 1));
  }
  
  @Test
  public void too_small_line_number() throws Exception {
    expect("Unexpected issue at line 1");
    check(
      "\nfoo(); // Noncompliant",
      Issue.create("msg1", 1));
  }

  @Test
  public void too_large_line_number() throws Exception {
    expect("Missing issue at line 1");
    check(
      "foo(); // Noncompliant",
      Issue.create("msg1", 2));
  }

  @Test
  public void right_message() throws Exception {
    check(
      "foo(); // Noncompliant {{msg1}}", 
      Issue.create("msg1", 1));
  }
  
  @Test
  public void wrong_message() throws Exception {
    expect("Bad message at line 1");
    check(
      "foo(); // Noncompliant {{msg1}}", 
      Issue.create("msg2", 1));
  }
  
  @Test
  public void right_effortToFix() throws Exception {
    check(
      "foo(); // Noncompliant [[effortToFix=42]] {{msg1}}", 
      Issue.create("msg1", 1).effortToFix(42));
  }
  
  @Test
  public void wrong_effortToFix() throws Exception {
    expect("Bad effortToFix at line 1");
    check(
      "foo(); // Noncompliant [[effortToFix=42]] {{msg1}}", 
      Issue.create("msg1", 1).effortToFix(77));
  }
  
  @Test
  public void invalid_param() throws Exception {
    thrown.expectMessage("Invalid param at line 1: xxx");
    check(
      "foo(); // Noncompliant [[xxx=1]] {{msg1}}", 
      Issue.create("msg1", 1));
  }

  @Test
  public void invalid_param_syntax() throws Exception {
    thrown.expectMessage("Invalid param at line 1: zzz");
    check(
      "foo(); // Noncompliant [[zzz]] {{msg1}}", 
      Issue.create("msg1", 1));
  }
  
  private void expect(String exceptionMessage) {
    thrown.expect(AssertionError.class);
    thrown.expectMessage(exceptionMessage);
  }

  private void check(String sourceCode, Issue... actualIssues) throws Exception {
    JavaScriptCheck check = new CheckStub(Arrays.asList(actualIssues));
    File fakeFile = folder.newFile("fakeFile.txt");
    Files.write(sourceCode, fakeFile, StandardCharsets.UTF_8);
    JavaScriptCheckVerifier.verify(check, fakeFile);
  }

  private static class CheckStub implements JavaScriptCheck {

    private final List<Issue> issues;

    public CheckStub(List<Issue> issues) {
      this.issues = issues;
    }

    @Override
    public TreeVisitorContext getContext() {
      return null;
    }

    @Override
    public void scanFile(TreeVisitorContext context) {
      for (Issue issue : issues) {
        issue.log(context, this);
      }
    }

  }

  private static class Issue {

    private final String message;
    private final int lineNumber;
    private Integer effortToFix;

    public Issue(String message, int lineNumber) {
      this.message = message;
      this.lineNumber = lineNumber;
    }

    public Issue effortToFix(int effortToFix) {
      this.effortToFix = effortToFix;
      return this;
    }

    public static Issue create(String message, int lineNumber) {
      return new Issue(message, lineNumber);
    }

    public void log(TreeVisitorContext context, JavaScriptCheck check) {
      if (effortToFix == null) {
        context.addIssue(check, lineNumber, message);
      } else {
        context.addIssue(check, lineNumber, message, effortToFix);
      }
    }

  }

}
