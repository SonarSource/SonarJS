/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.plugins.javascript;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextPointer;
import org.sonar.api.batch.fs.TextRange;

public class InputFileWrapper implements InputFile {
  private InputFile wrapped;

  public InputFileWrapper(InputFile wrapped) {
    this.wrapped = wrapped;
  }

  @Override
  public String key() {
    return wrapped.key();
  }

  @Override
  public boolean isFile() {
    return wrapped.isFile();
  }

  @Override
  public String relativePath() {
    return wrapped.relativePath();
  }

  @Override
  public String absolutePath() {
    return wrapped.absolutePath();
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
  public String language() {
    return wrapped.language();
  }

  @Override
  public Type type() {
    return wrapped.type();
  }

  @Override
  public InputStream inputStream() throws IOException {
    return Files.newInputStream(wrapped.path());
  }

  @Override
  public String contents() throws IOException {
    return new String(Files.readAllBytes(wrapped.path()), wrapped.charset());
  }

  @Override
  public Status status() {
    return wrapped.status();
  }

  @Override
  public int lines() {
    return wrapped.lines();
  }

  @Override
  public boolean isEmpty() {
    return wrapped.isEmpty();
  }

  @Override
  public TextPointer newPointer(int line, int lineOffset) {
    return wrapped.newPointer(line, lineOffset);
  }

  @Override
  public TextRange newRange(TextPointer start, TextPointer end) {
    return wrapped.newRange(start, end);
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
