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
package org.sonar.javascript.checks;

import com.google.common.collect.Sets;
import java.util.Set;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.PairPropertyTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "DuplicatePropertyName",
  name = "Property names should not be duplicated within an object literal",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
public class DuplicatePropertyNameCheck extends BaseTreeVisitor {

  private static final String MESSAGE = "Rename or remove duplicate property name '%s'.";

  @Override
  public void visitObjectLiteral(ObjectLiteralTree tree) {
    Set<String> keys = Sets.newHashSet();

    for (Tree property : tree.properties()) {
      if (property.is(Tree.Kind.PAIR_PROPERTY)) {
        visitPairProperty(keys, property, (PairPropertyTree) property);
      }

      if (property instanceof IdentifierTree) {
        IdentifierTree identifier = (IdentifierTree) property;
        addKey(keys, identifier.name(), property);
      }
    }
    super.visitObjectLiteral(tree);
  }

  private void visitPairProperty(Set<String> keys, Tree property, PairPropertyTree pairProperty) {
    ExpressionTree key = pairProperty.key();
    if (key.is(Tree.Kind.STRING_LITERAL)) {
      String value = ((LiteralTree) key).value();
      value = value.substring(1, value.length() - 1);
      addKey(keys, value, property);
    }

    if (key instanceof IdentifierTree) {
      addKey(keys, ((IdentifierTree) key).name(), property);
    }

    if (key.is(Tree.Kind.NUMERIC_LITERAL)) {
      addKey(keys, ((LiteralTree) key).value(), property);
    }
  }

  private void addKey(Set<String> keys, String key, Tree property) {
    if (keys.contains(EscapeUtils.unescape(key))) {
      getContext().addIssue(this, property, String.format(MESSAGE, key));
    } else {
      keys.add(key);
    }
  }

}
