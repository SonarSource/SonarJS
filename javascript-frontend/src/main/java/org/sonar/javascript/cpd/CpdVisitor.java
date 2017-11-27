/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
package org.sonar.javascript.cpd;

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cpd.NewCpdTokens;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

public class CpdVisitor extends SubscriptionVisitor {

  private final SensorContext sensorContext;
  private InputFile inputFile;
  private NewCpdTokens cpdTokens;

  public CpdVisitor(SensorContext sensorContext) {
    this.sensorContext = sensorContext;
  }

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Kind.TOKEN);
  }

  @Override
  public void visitFile(Tree scriptTree) {
    inputFile = getContext().getJavaScriptFile();
    cpdTokens = sensorContext.newCpdTokens().onFile(inputFile);
    super.visitFile(scriptTree);
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    super.leaveFile(scriptTree);
    cpdTokens.save();
  }

  @Override
  public void visitNode(Tree tree) {
    if (((InternalSyntaxToken) tree).isEOF()) {
      return;
    }

    SyntaxToken token = (SyntaxToken) tree;
    String text = token.text();

    if (text.startsWith("\"") || text.startsWith("'") || text.startsWith("`")) {
      text = "LITERAL";
    }

    TextRange range = inputFile.newRange(token.line(), token.column(), token.endLine(), token.endColumn());
    cpdTokens.addToken(range, text);
  }

}
