/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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

import java.util.Set;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.ImmutableSet;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "FutureReservedWords",
  priority = Priority.CRITICAL,
  // FIXME use constant instead
  tags = {"lock-in", Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class FutureReservedWordsCheck extends SquidCheck<LexerlessGrammar> {

  private static final Set<String> FUTURE_RESERVED_WORDS = ImmutableSet.of("implements", "interface", "package", "private", "protected", "public", "static");

  @Override
  public void init() {
    subscribeTo(EcmaScriptTokenType.IDENTIFIER);
  }

  @Override
  public void visitNode(AstNode astNode) {
    String value = astNode.getTokenValue();
    if (FUTURE_RESERVED_WORDS.contains(value)) {
      getContext().createLineViolation(this, "Rename \"" + value + "\" identifier to prevent potential conflicts with future evolutions of the JavaScript language.", astNode);
    }
  }

}
