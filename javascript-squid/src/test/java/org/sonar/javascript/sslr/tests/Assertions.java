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
package org.sonar.javascript.sslr.tests;

import com.google.common.base.Charsets;
import com.google.common.base.Preconditions;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.RecognitionException;
import com.sonar.sslr.api.Rule;
import com.sonar.sslr.api.Token;
import org.fest.assertions.GenericAssert;
import org.sonar.javascript.ast.parser.TreeFactory;
import org.sonar.javascript.parser.ActionGrammar;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.javascript.parser.sslr.ActionParser2;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.grammar.LexerlessGrammarBuilder;
import org.sonar.sslr.tests.ParsingResultComparisonFailure;
import org.sonar.sslr.tests.RuleAssert;

public class Assertions {

  public static RuleAssert assertThat(Rule actual) {
    return new RuleAssert(actual);
  }

  public static ParserAssert assertThat(GrammarRuleKey rule) {
    return assertThat(EcmaScriptGrammar.createGrammarBuilder(), rule);
  }

  public static ParserAssert assertThat(LexerlessGrammarBuilder b, GrammarRuleKey rule) {
    return new ParserAssert(new ActionParser2(
      Charsets.UTF_8,
      b,
      ActionGrammar.class,
      new TreeFactory(),
      rule));
  }

  public static class ParserAssert extends GenericAssert<ParserAssert, ActionParser2> {

    public ParserAssert(ActionParser2 actual) {
      super(ParserAssert.class, actual);
    }

    private void parseTillEof(String input) {
      AstNode astNode = actual.parse(input);

      if (astNode.getToIndex() != input.length()) {
        throw new RecognitionException(
          0, "Did not match till EOF, but till line " + astNode.getLastToken().getLine() + ": token \"" + astNode.getLastToken().getValue() + "\"");
      }
    }

    public ParserAssert matches(String input) {
      isNotNull();
      Preconditions.checkArgument(!hasTrailingWhitespaces(input), "Trailing whitespaces in input are not supported");
      String expected = "Rule '" + getRuleName() + "' should match:\n" + input;
      try {
        parseTillEof(input);
      } catch (RecognitionException e) {
        String actual = e.getMessage();
        throw new ParsingResultComparisonFailure(expected, actual);
      }
      return this;
    }

    private static boolean hasTrailingWhitespaces(String input) {
      return input.endsWith(" ") || input.endsWith("\n") || input.endsWith("\r") || input.endsWith("\t");
    }

    public ParserAssert notMatches(String input) {
      isNotNull();
      try {
        parseTillEof(input);
      } catch (RecognitionException e) {
        // expected
        return this;
      }
      throw new AssertionError("Rule '" + getRuleName() + "' should not match:\n" + input);
    }

    /**
     * Verifies that the actual <code>{@link Rule}</code> partially matches a given input.
     *
     * @param prefixToBeMatched the prefix that must be fully matched
     * @param remainingInput    the remainder of the input, which is not to be matched
     * @return this assertion object.
     */
    public ParserAssert matchesPrefix(String prefixToBeMatched, String remainingInput) {
      isNotNull();
      try {
        AstNode astNode = actual.parse(prefixToBeMatched + remainingInput);
        String parsedString = astNodeToString(astNode);

        if (prefixToBeMatched.length() != astNode.getToIndex()) {
          throw new RecognitionException(0,
            "Rule '" + getRuleName() + "' should match:\n" + prefixToBeMatched + "\nwhen followed by:\n" + remainingInput + "\nbut matched:\n" + parsedString);
        }
      } catch (RecognitionException e) {
        throw new RecognitionException(0, e.getMessage()  + "\n" +
          "Rule '" + getRuleName() + "' should match:\n" + prefixToBeMatched + "\nwhen followed by:\n" + remainingInput);
      }
      return this;
    }

    private static String astNodeToString(AstNode node) {
      StringBuilder builder = new StringBuilder();

      for (Token t : node.getTokens()) {
        builder.append(t.getValue());
      }
      return builder.toString();
    }

    private String getRuleName() {
      return actual.rootRule().toString();
    }

  }

}
