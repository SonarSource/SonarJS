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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.api.profiles.ProfileDefinition;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleFinder;
import org.sonar.api.utils.AnnotationUtils;
import org.sonar.api.utils.ValidationMessages;
import org.sonar.javascript.checks.AlertUseCheck;
import org.sonar.javascript.checks.ArrayAndObjectConstructorsCheck;
import org.sonar.javascript.checks.AssignmentWithinConditionCheck;
import org.sonar.javascript.checks.BoundOrAssignedEvalOrArgumentsCheck;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ComparisonWithNaNCheck;
import org.sonar.javascript.checks.ConsoleLoggingCheck;
import org.sonar.javascript.checks.DeadStoreCheck;
import org.sonar.javascript.checks.DebuggerStatementCheck;
import org.sonar.javascript.checks.DeleteArrayElementCheck;
import org.sonar.javascript.checks.DeleteNonPropertyCheck;
import org.sonar.javascript.checks.DifferentTypesComparisonCheck;
import org.sonar.javascript.checks.DuplicateBranchImplementationCheck;
import org.sonar.javascript.checks.DuplicateConditionIfElseAndSwitchCasesCheck;
import org.sonar.javascript.checks.DuplicateFunctionArgumentCheck;
import org.sonar.javascript.checks.DuplicatePropertyNameCheck;
import org.sonar.javascript.checks.EmptyBlockCheck;
import org.sonar.javascript.checks.EvalCheck;
import org.sonar.javascript.checks.ForInCheck;
import org.sonar.javascript.checks.ForLoopConditionAndUpdateCheck;
import org.sonar.javascript.checks.ForLoopIncrementSignCheck;
import org.sonar.javascript.checks.FunctionDefinitionInsideLoopCheck;
import org.sonar.javascript.checks.GlobalThisCheck;
import org.sonar.javascript.checks.HtmlCommentsCheck;
import org.sonar.javascript.checks.IdenticalExpressionOnBinaryOperatorCheck;
import org.sonar.javascript.checks.LocalStorageCheck;
import org.sonar.javascript.checks.MisorderedParameterListCheck;
import org.sonar.javascript.checks.MultilineBlockCurlyBraceCheck;
import org.sonar.javascript.checks.NewOperatorMisuseCheck;
import org.sonar.javascript.checks.NullDereferenceInConditionalCheck;
import org.sonar.javascript.checks.RedeclaredSymbolCheck;
import org.sonar.javascript.checks.ReturnInSetterCheck;
import org.sonar.javascript.checks.SelfAssignmentCheck;
import org.sonar.javascript.checks.TrailingCommaCheck;
import org.sonar.javascript.checks.UnaryPlusMinusWithObjectCheck;
import org.sonar.javascript.checks.UselessExpressionStatementCheck;
import org.sonar.javascript.checks.UselessIncrementCheck;
import org.sonar.javascript.checks.UselessStringOperationCheck;
import org.sonar.javascript.checks.WithStatementCheck;

public class JavaScriptSecurityProfile extends ProfileDefinition {

  private final RuleFinder ruleFinder;

  public JavaScriptSecurityProfile(RuleFinder ruleFinder) {
    this.ruleFinder = ruleFinder;
  }

  @Override
  public RulesProfile createProfile(ValidationMessages messages) {
    RulesProfile profile = RulesProfile.create(CheckList.SONAR_SECURITY_WAY_PROFILE, JavaScriptLanguage.KEY);
    for (Class<?> check : getChecks()) {
      String ruleKey = AnnotationUtils.getAnnotation(check, org.sonar.check.Rule.class).key();
      Rule rule = ruleFinder.findByKey(CheckList.REPOSITORY_KEY, ruleKey);
      profile.activateRule(rule, null);
    }
    return profile;
  }

  public static List<Class<?>> getChecks() {
    return ImmutableList.<Class<?>>of(
      AlertUseCheck.class,
      ArrayAndObjectConstructorsCheck.class,
      AssignmentWithinConditionCheck.class,
      BoundOrAssignedEvalOrArgumentsCheck.class,
      ComparisonWithNaNCheck.class,
      ConsoleLoggingCheck.class,
      DeadStoreCheck.class,
      DebuggerStatementCheck.class,
      DeleteArrayElementCheck.class,
      DeleteNonPropertyCheck.class,
      DifferentTypesComparisonCheck.class,
      DuplicateBranchImplementationCheck.class,
      DuplicateConditionIfElseAndSwitchCasesCheck.class,
      DuplicateFunctionArgumentCheck.class,
      DuplicatePropertyNameCheck.class,
      EmptyBlockCheck.class,
      EvalCheck.class,
      ForInCheck.class,
      ForLoopConditionAndUpdateCheck.class,
      ForLoopIncrementSignCheck.class,
      FunctionDefinitionInsideLoopCheck.class,
      GlobalThisCheck.class,
      HtmlCommentsCheck.class,
      IdenticalExpressionOnBinaryOperatorCheck.class,
      LocalStorageCheck.class,
      MisorderedParameterListCheck.class,
      MultilineBlockCurlyBraceCheck.class,
      NewOperatorMisuseCheck.class,
      NullDereferenceInConditionalCheck.class,
      RedeclaredSymbolCheck.class,
      ReturnInSetterCheck.class,
      SelfAssignmentCheck.class,
      TrailingCommaCheck.class,
      UnaryPlusMinusWithObjectCheck.class,
      UselessExpressionStatementCheck.class,
      UselessIncrementCheck.class,
      UselessStringOperationCheck.class,
      WithStatementCheck.class);
  }

}
