/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge.cache;

import java.io.ByteArrayInputStream;
import java.io.Closeable;
import java.io.DataInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Use variable length encoding for integers.
 * <a href="https://en.wikipedia.org/wiki/Variable-length_code">Variable Length Code</a>
 */
public class VarLengthInputStream implements Closeable {

  private final DataInputStream in;

  public VarLengthInputStream(byte[] input) {
    in = new DataInputStream(new ByteArrayInputStream(input));
  }

  public String readUTF() throws IOException {
    var length = readInt();
    var bytes = new byte[length];
    in.readFully(bytes);
    return new String(bytes, StandardCharsets.UTF_8);
  }

  public int readInt() throws IOException {
    int result = 0;
    int shift = 0;
    int b;
    do {
      // get 7 bits from next byte and add them to correct position
      b = readByte();
      result |= (b & 0x7F) << shift;
      shift += 7;
    } while ((b & 0x80) != 0);
    return result;
  }

  public byte readByte() throws IOException {
    return in.readByte();
  }

  @Override
  public void close() throws IOException {
    in.close();
  }
}
