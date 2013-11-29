/*
 * Sonar JavaScript Plugin
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

import com.google.common.collect.ImmutableSet;
import com.sonar.sslr.api.AstAndTokenVisitor;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.api.Trivia;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.squid.recognizer.CodeRecognizer;
import org.sonar.squid.recognizer.ContainsDetector;
import org.sonar.squid.recognizer.Detector;
import org.sonar.squid.recognizer.EndWithDetector;
import org.sonar.squid.recognizer.KeywordsDetector;
import org.sonar.squid.recognizer.LanguageFootprint;
import org.sonar.sslr.parser.LexerlessGrammar;

import java.util.Set;
import java.util.regex.Pattern;

@Rule(
  key = "CommentedCode",
  priority = Priority.BLOCKER)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class CommentedCodeCheck extends SquidCheck<LexerlessGrammar> implements AstAndTokenVisitor {

  private static final double THRESHOLD = 0.9;

  private final CodeRecognizer codeRecognizer = new CodeRecognizer(THRESHOLD, new JavaScriptRecognizer());
  private final Pattern regexpToDivideStringByLine = Pattern.compile("(\r?\n)|(\r)");

  private static class JavaScriptRecognizer implements LanguageFootprint {

    public Set<Detector> getDetectors() {
      return ImmutableSet.of(
          new EndWithDetector(0.95, '}', ';', '{'),
          new KeywordsDetector(0.3, EcmaScriptKeyword.keywordValues()),
          new ContainsDetector(0.95, "++", "--"),
          new ContainsDetector(0.95, "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|="),
          new ContainsDetector(0.95, "==", "!=", "===", "!=="));
    }

  }

  public void visitToken(Token token) {
    for (Trivia trivia : token.getTrivia()) {
      if (trivia.isComment() && !isJsDoc(trivia) && !isJsLint(trivia)  && !isJsHint(trivia) && !isGlobals(trivia)) {
        String lines[] = regexpToDivideStringByLine.split(getContext().getCommentAnalyser().getContents(trivia.getToken().getOriginalValue()));
        for (int lineOffset = 0; lineOffset < lines.length; lineOffset++) {
          if (codeRecognizer.isLineOfCode(lines[lineOffset])) {
            getContext().createLineViolation(this, "Sections of code should not be \"commented out\".", trivia.getToken().getLine() + lineOffset);
            break;
          }
        }
      }
    }
  }

  private boolean isJsDoc(Trivia trivia) {
    return trivia.getToken().getValue().startsWith("/**");
  }

  private boolean isJsLint(Trivia trivia) {
    return trivia.getToken().getValue().startsWith("/*jslint");
  }

  private boolean isJsHint(Trivia trivia) {
    return trivia.getToken().getValue().startsWith("/*jshint");
  }

  private boolean isGlobals(Trivia trivia) {
    return trivia.getToken().getValue().startsWith("/*global");
  }

}
