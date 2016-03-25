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

import org.apache.commons.lang.math.NumberUtils;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.expression.BracketMemberExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.LiteralTreeImpl;
import org.sonar.plugins.javascript.api.symbols.Type.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(key = "AssociativeArrays", priority = Priority.MAJOR, name = "Associative arrays should not be used.", tags = {
		"suspicious" })
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.DATA_RELIABILITY)
@SqaleConstantRemediation("10min")

public class AssociativeArraysCheck extends DoubleDispatchVisitorCheck {
	private static final String MESSAGE = "Only use a numeric index for Arrays";

	@Override
	public void visitAssignmentExpression(AssignmentExpressionTree tree) {
		if (tree.variable() instanceof BracketMemberExpressionTreeImpl) {
			if (((BracketMemberExpressionTreeImpl) tree.variable()).object().types().contains(Kind.ARRAY)) {
				LiteralTreeImpl al = (LiteralTreeImpl) ((BracketMemberExpressionTreeImpl) tree.variable()).property();

				if (!NumberUtils.isNumber(al.token().text())) {
					addLineIssue(tree, MESSAGE);
				}
			}

		}
		super.visitAssignmentExpression(tree);
	}
}
