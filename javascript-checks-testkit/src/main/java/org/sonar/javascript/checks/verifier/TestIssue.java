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
package org.sonar.javascript.checks.verifier;

import com.google.common.primitives.Ints;
import java.util.List;
import javax.annotation.Nullable;

class TestIssue {

  private String message;
  private final int line;
  private Integer effortToFix = null;
  private Integer startColumn = null;
  private Integer endColumn = null;
  private Integer endLine = null;
  private List<Integer> secondaryLines = null;

  private TestIssue(@Nullable String message, int line) {
    this.message = message;
    this.line = line;
  }

  public static TestIssue create(@Nullable String message, int lineNumber) {
    return new TestIssue(message, lineNumber);
  }

  public TestIssue message(String message) {
    this.message = message;
    return this;
  }

  public TestIssue columns(int startColumn, int endColumn) {
    startColumn(startColumn);
    endColumn(endColumn);
    return this;
  }

  public TestIssue startColumn(int startColumn) {
    this.startColumn = startColumn;
    return this;
  }

  public TestIssue endColumn(int endColumn) {
    this.endColumn = endColumn;
    return this;
  }

  public TestIssue effortToFix(int effortToFix) {
    this.effortToFix = effortToFix;
    return this;
  }

  public TestIssue endLine(int endLine) {
    this.endLine = endLine;
    return this;
  }

  public TestIssue secondary(int... lines) {
    return secondary(Ints.asList(lines));
  }

  public TestIssue secondary(List<Integer> secondaryLines) {
    this.secondaryLines = secondaryLines;
    return this;
  }

  public int line() {
    return line;
  }

  public Integer startColumn() {
    return startColumn;
  }

  public Integer endLine() {
    return endLine;
  }

  public Integer endColumn() {
    return endColumn;
  }

  public String message() {
    return message;
  }

  public Integer effortToFix() {
    return effortToFix;
  }

  public List<Integer> secondaryLines() {
    return secondaryLines;
  }
}
