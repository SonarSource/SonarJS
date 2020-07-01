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
package org.sonar.javascript.checks;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

/**
 * Base class for check classes which must ensure that the same issue is never raised
 * more than once for the same tree.
 */
public abstract class AbstractAnyPathSeCheck extends SeCheck {

  /**
   * Trees for which an issue has already been raised.
   * Used to avoid multiple identical issues raised by different execution paths.
   */
  private Set<Tree> treesWithIssue = new HashSet<>();

  @Override
  public final void startOfExecution(Scope functionScope) {
    treesWithIssue.clear();
    doStartOfExecution(functionScope);
  }

  /**
   * Override this method to perform actions before the start of execution.
   * This method is called for each execution, i.e. for each function in the file.
   * Note this method is called even if the execution limit was reached later.
   * @param functionScope scope corresponding to the function which will be executed
   */
  public void doStartOfExecution(Scope functionScope) {
    // do nothing
  }

  /**
   * Subclasses should not use this function, as this function bypasses the
   * non-duplication mechanism implemented by this class.
   * They should use one of the {@link AbstractAnyPathSeCheck#addUniqueIssue} methods.
   */
  @Override
  public final PreciseIssue addIssue(Tree tree, String message) {
    throw new UnsupportedOperationException("Use one of 'addUniqueIssue' methods");
  }

  @Override
  public final <T extends Issue> T addIssue(T issue) {
    throw new UnsupportedOperationException("Use one of 'addUniqueIssue' methods");
  }

  /**
   * Creates an issue for the specified tree and message, then adds the issue
   * to the list of issues.
   * Does nothing if an issue has already been added for the specified tree.
   * @return the created issue, or nothing if no issue was created
   */
  public Optional<PreciseIssue> addUniqueIssue(Tree tree, String message) {
    if (alreadyHasIssueOn(tree)) {
      return Optional.empty();
    }
    PreciseIssue issue = super.addIssue(tree, message);
    treesWithIssue.add(tree);
    return Optional.of(issue);
  }

  /**
   * Same contract as method {@link #addIssue(Tree, String)}.
   */
  public Optional<PreciseIssue> addUniqueIssue(Tree tree, String message, Tree... secondaryLocations) {
    Optional<PreciseIssue> issue = addUniqueIssue(tree, message);
    if (issue.isPresent()) {
      for (Tree location : secondaryLocations) {
        issue.get().secondary(location);
      }
    } 
    return issue;
  }

  /**
   * Same contract as method {@link #addIssue(Tree, String)}.
   */
  public Optional<PreciseIssue> addUniqueIssue(Tree tree, String message, IssueLocation... secondaryLocations) {
    Optional<PreciseIssue> issue = addUniqueIssue(tree, message);
    if (issue.isPresent()) {
      for (IssueLocation location : secondaryLocations) {
        issue.get().secondary(location);
      }
    }
    return issue;
  }

  /**
   * Returns <code>true</code> if an issue has already been reported for the specified tree.
   * This method does not have to be invoked prior to invoking method {@link #addUniqueIssue}: this
   * method is just an optimization tool that allows subclasses not to perform useless operations 
   * when an issue has already been reported. 
   */
  public boolean alreadyHasIssueOn(Tree tree) {
    return treesWithIssue.contains(tree);
  }

}
