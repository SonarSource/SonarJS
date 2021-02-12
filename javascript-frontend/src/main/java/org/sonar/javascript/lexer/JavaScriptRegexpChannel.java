/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.lexer;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableSet;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.impl.Lexer;
import java.util.List;
import java.util.Set;
import org.sonar.sslr.channel.Channel;
import org.sonar.sslr.channel.CodeReader;

import static com.sonar.sslr.impl.channel.RegexpChannelBuilder.regexp;
import static org.sonar.javascript.lexer.JavaScriptTokenType.REGULAR_EXPRESSION_LITERAL;

/**
 * Provides a heuristic to guess whether a forward slash starts a regular expression.
 * http://stackoverflow.com/questions/7936593/finding-regular-expression-literals-in-a-string-of-javascript-code
 */
public class JavaScriptRegexpChannel extends Channel<Lexer> {

  private static final String LINE_TERMINATOR_CHARACTERS = "\\r\\n\\u2028\\u2029";

  private static final String BACKSLASH_SEQUENCE = "\\\\[^" + LINE_TERMINATOR_CHARACTERS + "]";

  private static final String CLASS = "\\["
    + "(?:"
    // any character except closing square bracket, backslash, line terminator
    + "[^\\]\\\\" + LINE_TERMINATOR_CHARACTERS + "]"
    + "|" + BACKSLASH_SEQUENCE
    + ")*+"
    + "\\]";

  public static final String REGULAR_EXPRESSION = ""
    // A slash starts a regexp but only if not a comment start
    + "\\/(?![*/])"
    // which can contain any number of
    + "(?:"
    // any character except backslash, opening square bracket, slash, line terminator
    + "[^\\\\\\[/" + LINE_TERMINATOR_CHARACTERS + "]"
    // or class
    + "|" + CLASS
    // or escape sequence
    + "|" + BACKSLASH_SEQUENCE
    + ")*+"
    // finished by a '/'
    + "\\/"
    + "\\p{javaJavaIdentifierPart}*+";

  private final Channel<Lexer> delegate;

  public JavaScriptRegexpChannel() {
    this.delegate = regexp(REGULAR_EXPRESSION_LITERAL, REGULAR_EXPRESSION);
  }

  @Override
  public boolean consume(CodeReader code, Lexer output) {
    if (code.peek() == '/') {
      Token lastToken = getLastToken(output);
      if (lastToken == null || guessNextIsRegexp(lastToken.getValue())) {
        return delegate.consume(code, output);
      }
    }
    return false;
  }

  private static Token getLastToken(Lexer output) {
    List<Token> tokens = output.getTokens();
    return tokens.isEmpty() ? null : tokens.get(tokens.size() - 1);
  }

  private static final Set<String> WHOLE_TOKENS = ImmutableSet.of(
    "break",
    "case",
    "continue",
    "delete",
    "do",
    "else",
    "finally",
    "in",
    "instanceof",
    "return",
    "throw",
    "try",
    "typeof",
    "void",
    // Binary operators which cannot be followed by a division operator:
    // Match + but not ++. += is handled below.
    "+",
    // Match - but not --. -= is handled below.
    "-",
    // Match . but not a number with a trailing decimal.
    ".",
    // Match /, but not a regexp. /= is handled below
    "/",
    // Second binary operand cannot start a division.
    ",",
    // Ditto binary operand.
    "*");

  private static final String[] ENDS = new String[]{
    // ! prefix operator operand cannot start with a division
    "!",
    // % second binary operand cannot start with a division
    "%",
    // &, && ditto binary operand
    "&",
    // ( expression cannot start with a division
    "(",
    // : property value, labelled statement, and operand of ?: cannot start with a division
    ":",
    // ; statement & for condition cannot start with division
    ";",
    // <, <<, << ditto binary operand
    "<",
    // !=, !==, %=, &&=, &=, *=, +=, -=, /=, <<=, <=, =, ==, ===, >=, >>=, >>>=, ^=, |=, ||=
    // All are binary operands (assignment ops or comparisons) whose right
    // operand cannot start with a division operator
    "=",
    // >, >>, >>> ditto binary operand
    ">",
    // ? expression in ?: cannot start with a division operator
    "?",
    // [ first array value & key expression cannot start with a division
    "[",
    // ^ ditto binary operand
    "^",
    // { statement in block and object property key cannot start with a division
    "{",
    // |, || ditto binary operand
    "|",
    // } PROBLEMATIC: could be an object literal divided or a block.
    // More likely to be start of a statement after a block which cannot start with a /.
    "}",
    // ~ ditto binary operand
    "~"
  };

  // The exclusion of ++ and -- from the above is also problematic.
  // Both are prefix and postfix operators.
  // Given that there is rarely a good reason to increment a regular expression
  // and good reason to have a post-increment operator as the left operand of
  // a division (x++ / y) this pattern treats ++ and -- as division preceders.

  /**
   * Returns true if a slash after given token starts a regular expression instead of div operator.
   * <p>
   * This fails on some valid but nonsensical JavaScript programs like
   * {@code x = ++/foo/i} which is quite different than
   * {@code x++/foo/i}, but is not known to fail on any known useful programs.
   * </p>
   *
   * @param preceder non-whitespace, non comment token preceding the slash
   */
  @VisibleForTesting
  static boolean guessNextIsRegexp(String preceder) {
    if (WHOLE_TOKENS.contains(preceder)) {
      return true;
    }
    for (String end : ENDS) {
      if (preceder.endsWith(end)) {
        return true;
      }
    }
    return false;
  }

}
