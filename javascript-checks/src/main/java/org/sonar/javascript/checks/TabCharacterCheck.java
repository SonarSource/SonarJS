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
package org.sonar.javascript.checks;

import com.google.common.io.CharStreams;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.LineIssue;

@Rule(key = "TabCharacter")
public class TabCharacterCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Replace all tab characters in this file by sequences of white-spaces.";

  @Override
  public void visitScript(ScriptTree tree) {
    InputFile inputFile = getContext().getFile();
    List<String> lines;
    try (InputStreamReader inr = new InputStreamReader(inputFile.inputStream(), inputFile.charset())) {
      lines = CharStreams.readLines(inr);
    } catch (IOException e) {
      throw new IllegalStateException("Unable to execute rule \"TabCharacter\" for file " + getContext().getFileName(), e);
    }

    for (int i = 0; i < lines.size(); i++) {
      if (lines.get(i).contains("\t")) {
        addIssue(new LineIssue(this, i + 1, MESSAGE));
        break;
      }
    }

  }
}
