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
package org.sonar.javascript.metrics;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.TextPointer;
import org.sonar.api.batch.fs.TextRange;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;

public class SonarLintHelper {

  public static final Version V6_0 = Version.create(6, 0);
  public static final Version V6_2 = Version.create(6, 2);

  private SonarLintHelper() {
    // utility class, forbidden constructor
  }

  public static InputFile wrap(InputFile inputFile, SensorContext context) {
    Version version = context.getSonarQubeVersion();
    if (version.isGreaterThanOrEqual(V6_2)) {
      return inputFile;
    }
    if (version.isGreaterThanOrEqual(V6_0)) {
      return new InputFileV60Compat(inputFile);
    }
    return new InputFileV56Compat(inputFile, context);
  }

  public static Iterable<InputFile> wrap(Iterable<InputFile> inputFiles, SensorContext context) {
    Version version = context.getSonarQubeVersion();
    if (version.isGreaterThanOrEqual(V6_2)) {
      return inputFiles;
    }
    if (version.isGreaterThanOrEqual(V6_0)) {
      return inputFileStream(inputFiles).map(InputFileV60Compat::new).collect(Collectors.toList());
    }
    return inputFileStream(inputFiles).map(f -> new InputFileV56Compat(f, context)).collect(Collectors.toList());
  }

  private static Stream<InputFile> inputFileStream(Iterable<InputFile> inputFiles) {
    return StreamSupport.stream(inputFiles.spliterator(), false);
  }

  public static InputFile unwrap(InputFile inputFile) {
    if (inputFile instanceof InputFileWrapper) {
      return ((InputFileWrapper) inputFile).inputfile();
    }
    return inputFile;
  }

  public static InputStream inputStream(InputFile inputFile) throws IOException {
    if (inputFile instanceof InputFileWrapper) {
      return ((InputFileWrapper) inputFile).inputStream();
    }
    return inputFile.inputStream();
  }

  public static String contents(InputFile inputFile) throws IOException {
    if (inputFile instanceof InputFileWrapper) {
      return ((InputFileWrapper) inputFile).contents();
    }
    return inputFile.contents();
  }

  public static Charset charset(InputFile inputFile) {
    if (inputFile instanceof InputFileWrapper) {
      return ((InputFileWrapper) inputFile).charset();
    }
    return inputFile.charset();
  }
}

abstract class InputFileWrapper implements InputFile {
  private final InputFile wrapped;

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
    return wrapped.inputStream();
  }

  @Override
  public String contents() throws IOException {
    return wrapped.contents();
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

  public InputFile inputfile() {
    return wrapped;
  }
}

class InputFileV60Compat extends InputFileWrapper {
  public InputFileV60Compat(InputFile wrapped) {
    super(wrapped);
  }

  @Override
  public InputStream inputStream() throws IOException {
    return Files.newInputStream(this.path());
  }

  @Override
  public String contents() throws IOException {
    return new String(Files.readAllBytes(this.path()), this.charset());
  }
}

class InputFileV56Compat extends InputFileV60Compat {

  private final Charset charset;

  public InputFileV56Compat(InputFile wrapped, SensorContext context) {
    super(wrapped);
    this.charset = context.fileSystem().encoding();
  }

  @Override
  public Charset charset() {
    return charset;
  }
}
