/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.eslint.cache;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;

public class CpdDeserializer {

  private final VarLengthInputStream in;
  private final VarLengthInputStream stringTableIn;

  private StringTable stringTable;

  private CpdDeserializer(byte[] data, byte[] stringTable) {
    in = new VarLengthInputStream(data);
    stringTableIn = new VarLengthInputStream(stringTable);
  }

  public static CpdData fromBinary(byte[] data, byte[] stringTable) throws IOException {
    var deserializer = new CpdDeserializer(data, stringTable);
    return deserializer.convert();
  }

  private CpdData convert() throws IOException {
    try (in; stringTableIn) {
      stringTable = readStringTable();

      var sizeOfCpdTokens = readInt();
      var cpdTokens = new ArrayList<EslintBridgeServer.CpdToken>(sizeOfCpdTokens);

      for (int i = 0; i < sizeOfCpdTokens; i++) {
        readCpdToken(cpdTokens);
      }

      if (!"END".equals(in.readUTF())) {
        throw new IOException("Can't read data from cache, format corrupted");
      }

      return new CpdData(cpdTokens);
    } catch (IOException e) {
      throw new IOException("Can't deserialize data from the cache", e);
    }
  }

  private void readCpdToken(List<EslintBridgeServer.CpdToken> cpdTokens) throws IOException {
    var cpdToken = new EslintBridgeServer.CpdToken();
    var location = new EslintBridgeServer.Location();
    location.setStartLine(readInt());
    location.setStartCol(readInt());
    location.setEndLine(readInt());
    location.setEndCol(readInt());
    cpdToken.setLocation(location);
    cpdToken.setImage(readString());
    cpdTokens.add(cpdToken);
  }

  private int readInt() throws IOException {
    return in.readInt();
  }

  private String readString() throws IOException {
    return stringTable.getString(in.readInt());
  }

  private StringTable readStringTable() throws IOException {
    var size = stringTableIn.readInt();
    var byIndex = new ArrayList<String>(size);
    for (int i = 0; i < size; i++) {
      byIndex.add(stringTableIn.readUTF());
    }
    if (!"END".equals(stringTableIn.readUTF())) {
      throw new IOException("Can't read data from cache, format corrupted");
    }
    return new StringTable(byIndex);
  }

}
