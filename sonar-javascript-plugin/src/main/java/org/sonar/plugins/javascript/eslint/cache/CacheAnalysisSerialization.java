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
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer;

import static java.util.Arrays.asList;

public class CacheAnalysisSerialization extends AbstractSerialization {

  private final UCFGFilesSerialization ucfgFileSerialization;
  private final JsonSerialization<CpdData> cpdDataSerialization;

  CacheAnalysisSerialization(SensorContext context, CacheKey cacheKey) {
    super(context, cacheKey);
    ucfgFileSerialization = new UCFGFilesSerialization(context, cacheKey.forUcfg());
    cpdDataSerialization = new JsonSerialization<>(CpdData.class, context, cacheKey.forCpd());
  }

  @Override
  boolean isInCache() {
    return ucfgFileSerialization.isInCache() && cpdDataSerialization.isInCache();
  }

  CacheAnalysis readFromCache() throws IOException {
    ucfgFileSerialization.readFromCache();

    var cpdData = cpdDataSerialization.readFromCache();
    if (cpdData == null || cpdData.getCpdTokens() == null) {
      throw new IOException("The CPD tokens are null");
    }

    return CacheAnalysis.fromCache(cpdData.getCpdTokens().toArray(new EslintBridgeServer.CpdToken[0]));
  }

  void writeToCache(CacheAnalysis analysis) throws IOException {
    ucfgFileSerialization.writeToCache(analysis.getUcfgPaths());
    cpdDataSerialization.writeToCache(new CpdData(asList(analysis.getCpdTokens())));
  }

  @Override
  void copyFromPrevious() {
    ucfgFileSerialization.copyFromPrevious();
    cpdDataSerialization.copyFromPrevious();
  }

}
