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
package org.sonar.javascript.checks;

import com.google.common.io.Files;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.lexer.JavaScriptLexer;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.visitors.SubscriptionBaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

@Rule(
  key = "TrailingWhitespace",
  name = "Lines should not end with trailing whitespaces",
  priority = Priority.MINOR,
  tags = {Tags.CONVENTION})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("1min")
public class TrailingWhitespaceCheck extends SubscriptionBaseTreeVisitor implements CharsetAwareVisitor {

  private static final Logger LOG = LoggerFactory.getLogger(TrailingWhitespaceCheck.class);
  private Charset charset;

  @Override
  public void setCharset(Charset charset) {
    this.charset = charset;
  }

  @Override
  public List<Tree.Kind> nodesToVisit() {
    return Collections.emptyList();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    List<String> lines = Collections.emptyList();

    try {
      lines = Files.readLines(getContext().getFile(), charset);

    } catch (IOException e) {
      LOG.error("Unable to execute rule \"TrailingWhitespace\" for file {} because of error: {}",
        getContext().getFile().getName(), e);
    }

    for (int i = 0; i < lines.size(); i++) {
      String line = lines.get(i);

      if (line.length() > 0 && Pattern.matches("[" + JavaScriptLexer.WHITESPACE + "]", line.subSequence(line.length() - 1, line.length()))) {
        getContext().addIssue(this, i + 1, "Remove the useless trailing whitespaces at the end of this line.");
      }
    }

  }

}
