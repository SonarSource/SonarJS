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
package org.sonar.javascript.compat;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.Path;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextPointer;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.plugins.javascript.api.visitors.JavaScriptFile;

/**
 * A compatibility wrapper for InputFile. See class hierarchy.
 *
 * All methods of this class simply delegate to the wrapped instance, except `wrapped`.
 */
public class CompatibleInputFile implements JavaScriptFile {
  private final InputFile wrapped;

  CompatibleInputFile(InputFile wrapped) {
    this.wrapped = wrapped;
  }

  /**
   * Get the original InputFile instance wrapped inside.
   *
   * @return original InputFile instance
   */
  public InputFile wrapped() {
    return wrapped;
  }

  @Override
  public String absolutePath() {
    return wrapped.absolutePath();
  }

  @Override
  public String relativePath() {
    return wrapped.relativePath();
  }

  @Override
  public File file() {
    return wrapped.file();
  }

  @Override
  public Path path() {
    return wrapped.path();
  }

  @Override
  public InputStream inputStream() {
    try {
      return wrapped.inputStream();
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  @Override
  public String contents() {
    try {
      return wrapped.contents();
    } catch (IOException e) {
      throw new IllegalStateException(e);
    }
  }

  @Override
  public TextPointer newPointer(int line, int lineOffset) {
    return wrapped.newPointer(line, lineOffset);
  }

  @Override
  public TextRange newRange(int startLine, int startLineOffset, int endLine, int endLineOffset) {
    return wrapped.newRange(startLine, startLineOffset, endLine, endLineOffset);
  }

  @Override
  public TextRange selectLine(int line) {
    return wrapped.selectLine(line);
  }

  @Override
  public Charset charset() {
    return wrapped.charset();
  }
}
