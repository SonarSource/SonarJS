/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.sonarlint;

import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.TsConfigOrigin;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;

@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class TsConfigCacheImpl implements TsConfigCache {

  private static final Logger LOG = LoggerFactory.getLogger(TsConfigCacheImpl.class);

  BridgeServer bridgeServer;
  TsConfigOrigin origin;
  int projectSize;
  boolean shouldClearDependenciesCache;
  FSListener fsListener;

  Map<TsConfigOrigin, Cache> cacheMap = new EnumMap<>(TsConfigOrigin.class);

  public TsConfigCacheImpl(BridgeServer bridgeServer, FSListener fsListener) {
    this.bridgeServer = bridgeServer;
    this.fsListener = fsListener;
    cacheMap.put(TsConfigOrigin.PROPERTY, new Cache());
    cacheMap.put(TsConfigOrigin.LOOKUP, new Cache());
    cacheMap.put(TsConfigOrigin.FALLBACK, new Cache());
    shouldClearDependenciesCache = false;
  }

  class Cache {

    Map<String, TsConfigFile> inputFileToTsConfigFilesMap = new HashMap<>();
    Set<String> discoveredTsConfigFiles = new HashSet<>();
    List<String> originalTsConfigFiles = new ArrayList<>();
    Deque<String> pendingTsConfigFiles = new ArrayDeque<>();
    boolean initialized = false;

    TsConfigFile getTsConfigForInputFile(InputFile inputFile) {
      var inputFilePath = inputFile.absolutePath();
      if (!initialized) {
        LOG.error("TsConfigCacheImpl is not initialized for file {}", inputFilePath);
        return null;
      }
      if (inputFileToTsConfigFilesMap.containsKey(inputFilePath)) {
        return inputFileToTsConfigFilesMap.get(inputFilePath);
      }

      pendingTsConfigFiles = improvedPendingTsConfigOrder(inputFile);

      LOG.debug(
        "Continuing BFS for file: {}, pending order: {}",
        inputFilePath,
        pendingTsConfigFiles
      );
      while (!pendingTsConfigFiles.isEmpty()) {
        var tsConfigPath = pendingTsConfigFiles.pop();
        LOG.debug("Computing tsconfig {} from bridge", tsConfigPath);
        TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(tsConfigPath);
        tsConfigFile
          .getFiles()
          .forEach(file -> inputFileToTsConfigFilesMap.putIfAbsent(file, tsConfigFile));
        if (!tsConfigFile.getProjectReferences().isEmpty()) {
          LOG.info("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
          tsConfigFile
            .getProjectReferences()
            .stream()
            .filter(refPath -> !discoveredTsConfigFiles.contains(refPath))
            .forEach(refPath -> {
              discoveredTsConfigFiles.add(refPath);
              pendingTsConfigFiles.addFirst(refPath);
            });
        }
        if (inputFileToTsConfigFilesMap.containsKey(inputFilePath)) {
          var foundTsConfigFile = inputFileToTsConfigFilesMap.get(inputFilePath);
          LOG.info(
            "Using tsConfig {} for file source file {} ({}/{} tsconfigs not yet checked)",
            foundTsConfigFile.getFilename(),
            inputFilePath,
            pendingTsConfigFiles.size(),
            discoveredTsConfigFiles.size()
          );
          return inputFileToTsConfigFilesMap.get(inputFilePath);
        }
      }
      inputFileToTsConfigFilesMap.put(inputFilePath, null);
      return null;
    }

    void initializeOriginalTsConfigs(List<String> tsconfigs) {
      initialized = true;
      originalTsConfigFiles = tsconfigs;
      clearFileToTsConfigCache();
    }

    void clearAll() {
      initialized = false;
      originalTsConfigFiles = new ArrayList<>();
      clearFileToTsConfigCache();
    }

    void clearFileToTsConfigCache() {
      inputFileToTsConfigFilesMap.clear();
      discoveredTsConfigFiles = new HashSet<>(originalTsConfigFiles);
      pendingTsConfigFiles = new ArrayDeque<>(originalTsConfigFiles);
    }

    /**
     * Compute an improved order of the pending tsconfig files with respect to the given inputFile.
     * This is based on the assumption that a tsconfig *should be* in some parent folder of the inputFile.
     * As an example, for a file in "/usr/path1/path2/index.js", we would identify look for tsconfig's in the exact
     * folders * "/", "/usr/", "/usr/path1/", "/usr/path1/path2/" and move them to the front.
     * Note: This will not change the order between the identified and non-identified tsconfigs.
     * Time and space complexity: O(n).
     *
     * @param inputFile current file to analyze
     * @return Reordered queue of tsconfig files
     */
    private Deque<String> improvedPendingTsConfigOrder(InputFile inputFile) {
      var newPendingTsConfigFiles = new ArrayDeque<String>();
      var notMatchingPendingTsConfigFiles = new ArrayList<String>();
      pendingTsConfigFiles.forEach(ts -> {
        if (
          inputFile.absolutePath().startsWith(Path.of(ts).getParent().toAbsolutePath().toString())
        ) {
          newPendingTsConfigFiles.add(ts);
        } else {
          notMatchingPendingTsConfigFiles.add(ts);
        }
      });
      newPendingTsConfigFiles.addAll(notMatchingPendingTsConfigFiles);
      return newPendingTsConfigFiles;
    }
  }

  public TsConfigFile getTsConfigForInputFile(InputFile inputFile) {
    if (origin == null) {
      return null;
    }
    return cacheMap.get(origin).getTsConfigForInputFile(inputFile);
  }

  public @Nullable List<String> listCachedTsConfigs(TsConfigOrigin tsConfigOrigin) {
    var currentCache = cacheMap.get(tsConfigOrigin);

    if (currentCache.initialized) {
      LOG.debug("TsConfigCache is already initialized");
      return currentCache.originalTsConfigFiles;
    }
    return null;
  }

  public void setOrigin(TsConfigOrigin tsConfigOrigin) {
    origin = tsConfigOrigin;
  }

  @Override
  public boolean getAndResetShouldClearDependenciesCache() {
    var result = shouldClearDependenciesCache;
    shouldClearDependenciesCache = false;
    return result;
  }

  public void initializeWith(List<String> tsConfigPaths, TsConfigOrigin tsConfigOrigin) {
    var cache = cacheMap.get(tsConfigOrigin);
    if (tsConfigOrigin == TsConfigOrigin.FALLBACK && cache.initialized) {
      return;
    }
    if (
      tsConfigOrigin != TsConfigOrigin.FALLBACK && cache.originalTsConfigFiles.equals(tsConfigPaths)
    ) {
      return;
    }

    LOG.debug("Resetting the TsConfigCache {}", tsConfigOrigin);
    cache.initializeOriginalTsConfigs(tsConfigPaths);
  }

  @Override
  public void digestFileEvents() {
    for (var fsEvent : fsListener.listFSEvents()) {
      var file = fsEvent.getKey();
      var filename = file.absolutePath();
      var moduleFileEvent = fsEvent.getValue();
      LOG.debug("Processing file event {} with event {}", filename, moduleFileEvent);
      // Look for any event on files named *tsconfig*.json
      // Filenames other than tsconfig.json can be discovered through references
      if (filename.endsWith("json") && file.filename().contains("tsconfig")) {
        LOG.debug("Clearing tsconfig cache");
        cacheMap.get(TsConfigOrigin.LOOKUP).clearAll();
        if (cacheMap.get(TsConfigOrigin.PROPERTY).discoveredTsConfigFiles.contains(filename)) {
          cacheMap.get(TsConfigOrigin.PROPERTY).clearAll();
        }
      } else if (filename.endsWith("package.json")) {
        LOG.debug("Package json update, will clear dependency cache on next analysis request.");
        shouldClearDependenciesCache = true;
      } else if (
        moduleFileEvent == ModuleFileEvent.Type.CREATED &&
        (TypeScriptLanguage.KEY.equals(file.language()) ||
          JavaScriptLanguage.KEY.equals(file.language()))
      ) {
        // The file to tsconfig cache is cleared, as potentially the tsconfig file that would cover this new file
        // has already been processed, and we would not be aware of it. By clearing the cache, we guarantee correctness.
        LOG.debug("Clearing input file to tsconfig cache");
        cacheMap.values().forEach(Cache::clearFileToTsConfigCache);
      }
    }
  }

  public void setProjectSize(int projectSize) {
    this.projectSize = projectSize;
  }

  public int getProjectSize() {
    return projectSize;
  }
}
