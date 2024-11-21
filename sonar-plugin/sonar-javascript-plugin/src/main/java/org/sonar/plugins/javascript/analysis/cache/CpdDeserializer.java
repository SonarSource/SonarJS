/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis.cache;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.sonar.plugins.javascript.bridge.BridgeServer.CpdToken;
import org.sonar.plugins.javascript.bridge.BridgeServer.Location;

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
      var cpdTokens = new ArrayList<CpdToken>(sizeOfCpdTokens);

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

  private void readCpdToken(List<CpdToken> cpdTokens) throws IOException {
    var location = new Location(readInt(), readInt(), readInt(), readInt());
    var cpdToken = new CpdToken(location, readString());
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
