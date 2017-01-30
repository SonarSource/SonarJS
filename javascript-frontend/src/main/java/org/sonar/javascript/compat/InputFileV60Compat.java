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

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import org.sonar.api.batch.fs.InputFile;

/**
 * Makes the wrapped API 6.0+ instance compatible with API 6.2,
 * by providing the inputStream() and contents() methods.
 */
class InputFileV60Compat extends CompatibleInputFile {
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
