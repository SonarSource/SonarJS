package org.sonar.samples.javascript.checks;

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
	private static final String MESSAGE = "Only use numeric a numeric index for Arrays";

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
