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

import java.util.List;
import java.util.Set;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.google.common.collect.Sets;
import com.sonar.sslr.api.AstNode;

@Rule(
  key = "DuplicatePropertyName",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.PITFALL})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class DuplicatePropertyNameCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.OBJECT_LITERAL);
  }

  @Override
  public void visitNode(AstNode astNode) {
    Set<String> values = Sets.newHashSet();
    List<AstNode> pairProperties = astNode.getChildren(Kind.PAIR_PROPERTY, Kind.IDENTIFIER_REFERENCE);

    for (AstNode property : pairProperties) {

      AstNode propertyName = property.getFirstChild();
      String value = propertyName.getTokenValue();

      if (value.startsWith("\"") || value.startsWith("'")) {
        value = value.substring(1, value.length() - 1);
      }
      String unescaped = EscapeUtils.unescape(value);

      if (values.contains(unescaped)) {
        getContext().createLineViolation(this, "Rename or remove duplicate property name '" + value + "'.", propertyName);
      } else {
        values.add(unescaped);
      }
    }
  }

}
