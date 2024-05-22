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
package org.sonar.plugins.javascript.analysis.cache;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.gson.Gson;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer;

public class CacheTestUtils {

  public static final String CPD_TOKENS =
    "{ cpdTokens: [{\"location\": { \"startLine\":1,\"startCol\":0,\"endLine\":1,\"endCol\":4},\"image\":\"LITERAL\"},{\"location\": { \"startLine\":2,\"startCol\":1,\"endLine\":2,\"endCol\":5},\"image\":\"if\"}] }";

  private CacheTestUtils() {}

  public static CpdSerializer.SerializationResult getSerializedCpdTokens(
    List<BridgeServer.CpdToken> cpdTokens
  ) throws IOException {
    return CpdSerializer.toBinary(new CpdData(cpdTokens));
  }

  public static List<BridgeServer.CpdToken> getCpdTokens() {
    return new Gson().fromJson(CPD_TOKENS, CpdData.class).getCpdTokens();
  }

  public static SensorContextTester createContextWithCache(
    Path baseDir,
    Path workDir,
    String filePath
  ) throws IOException {
    var context = SensorContextTester.create(baseDir.toRealPath());
    context.fileSystem().setWorkDir(workDir);
    context.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 6),
        SonarQubeSide.SCANNER,
        SonarEdition.ENTERPRISE
      )
    );
    context.setNextCache(mock(WriteCache.class));
    context.setPreviousCache(mock(ReadCache.class));
    context.setCanSkipUnchangedFiles(true);

    var cache = context.previousCache();
    when(cache.contains("jssecurity:ucfgs:JSON:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("jssecurity:ucfgs:JSON:moduleKey:" + filePath))
      .thenReturn(new ByteArrayInputStream("{\"fileSizes\":[]}".getBytes(StandardCharsets.UTF_8)));
    when(cache.contains("jssecurity:ucfgs:SEQ:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("jssecurity:ucfgs:SEQ:moduleKey:" + filePath))
      .thenReturn(new ByteArrayInputStream(new byte[0]));

    when(cache.contains("js:cpd:DATA:moduleKey:" + filePath)).thenReturn(true);
    when(cache.contains("js:cpd:STRING_TABLE:moduleKey:" + filePath)).thenReturn(true);

    try {
      var result = getSerializedCpdTokens(getCpdTokens());
      when(cache.read("js:cpd:DATA:moduleKey:" + filePath))
        .thenReturn(new ByteArrayInputStream(result.getData()));
      when(cache.read("js:cpd:STRING_TABLE:moduleKey:" + filePath))
        .thenReturn(new ByteArrayInputStream(result.getStringTable()));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }

    when(cache.contains("js:filemetadata:moduleKey:" + filePath)).thenReturn(true);
    when(cache.read("js:filemetadata:moduleKey:" + filePath))
      .thenReturn(
        inputStream(
          "{\"size\":34,\"hash\":[-58,-66,77,-102,-13,-49,96,126,-125,-65,-111,109,-34,85,27,97,46,-58,-76,113," +
          "-97,53,64,108,112,-2,104,-75,-23,-111,119,77]}"
        )
      );

    return context;
  }

  public static InputStream inputStream(byte[] bytes) {
    return new ByteArrayInputStream(bytes);
  }

  public static InputStream inputStream(String string) {
    return inputStream(string.getBytes(StandardCharsets.UTF_8));
  }

  public static InputStream inputStream(Object object) {
    return inputStream(new Gson().toJson(object));
  }

  public static InputStream inputStream(Path path) throws IOException {
    return new BufferedInputStream(Files.newInputStream(path));
  }
}
