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
package org.sonar.javascript.parser.sslr;

import org.sonar.sslr.grammar.GrammarRuleKey;

import java.util.List;

public interface GrammarBuilder<N, T> {

  <U> NonterminalBuilder<U> nonterminal();

  <U> NonterminalBuilder<U> nonterminal(GrammarRuleKey ruleKey);

  <U> U firstOf(U... methods);

  <U> Optional<U> optional(U method);

  <U> List<U> oneOrMore(U method);

  <U> Optional<List<U>> zeroOrMore(U method);

  N invokeRule(GrammarRuleKey ruleKey);

  T token(GrammarRuleKey ruleKey);

}
