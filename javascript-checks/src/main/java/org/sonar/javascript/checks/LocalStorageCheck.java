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

import com.google.common.collect.ImmutableList;
import java.util.List;
import java.util.Map;
import org.apache.commons.collections.map.HashedMap;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.SqaleLinearWithOffsetRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;


@Rule(key = "S3271",
  name = "Local storage should not be used",
  priority = Priority.CRITICAL,
  tags = {Tags.SECURITY, Tags.OWASP_A6})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.SECURITY_FEATURES)
@SqaleLinearWithOffsetRemediation(
  coeff = "5min",
  offset = "1h",
  effortToFixDescription = "per additional use of the api")
public class LocalStorageCheck extends BaseTreeVisitor {

  private static final List<String> API_CALLS = ImmutableList.of(
    "getItem",
    "setItem",
    "removeItem",
    "clear",
    "key",
    "length"
  );

  private static final List<String> OBJECTS = ImmutableList.of(
    "localStorage",
    "sessionStorage"
  );

  Map<String, StorageType> storageTypes = new HashedMap();

  @Override
  public void visitScript(ScriptTree tree) {
    storageTypes.clear();
    super.visitScript(tree);
    checkForIssues();
  }

  @Override
  public void visitMemberExpression(MemberExpressionTree tree) {

    if (tree.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree dme = (DotMemberExpressionTree) tree;

      String obj = getObjectName(dme);
      String method = dme.property().name();

      if (OBJECTS.contains(obj) && API_CALLS.contains(method)) {
        saveDebtLocation(tree, obj);
      }
    } else if (tree.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION)) {
      String obj = getObjectName(tree);
      if (OBJECTS.contains(obj)) {
        saveDebtLocation(tree, obj);
      }
    }

    super.visitMemberExpression(tree);
  }

  private void saveDebtLocation(MemberExpressionTree tree, String obj) {

    StorageType type = storageTypes.get(obj);
    if (type == null) {
      storageTypes.put(obj, new StorageType(tree));
    } else {
      type.inc();
    }
  }

  private static String getObjectName(MemberExpressionTree dme) {
    if (dme.object().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree d2 = (DotMemberExpressionTree) dme.object();
      return d2.property().name();
    } else {
      return CheckUtils.asString(dme.object());
    }
  }

  private void checkForIssues() {
    for (Map.Entry<String, StorageType> entry : storageTypes.entrySet()) {
      int cost = entry.getValue().count - 1;

      String message = String.format("Remove all use of \"%s\"; use cookies or store the data on the server instead.", entry.getKey());
      getContext().addIssue(this, entry.getValue().tree, message, (double) cost);
    }
  }

  private static class StorageType {
    private MemberExpressionTree tree;
    private int count;

    StorageType(MemberExpressionTree tree) {
      this.tree = tree;
      this.count = 1;
    }

    void inc() {
      this.count++;
    }
  }
}
