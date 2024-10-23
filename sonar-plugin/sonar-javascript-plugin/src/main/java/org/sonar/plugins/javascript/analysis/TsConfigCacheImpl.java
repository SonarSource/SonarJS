package org.sonar.plugins.javascript.analysis;


import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class TsConfigCacheImpl implements TsConfigCache, ModuleFileListener {
  private static final Logger LOG = LoggerFactory.getLogger(TsConfigCacheImpl.class);

  BridgeServer bridgeServer;

  public TsConfigProvider.CacheOrigin origin;

  class Cache {
    Map<String, TsConfigFile> inputFileToTsConfigFilesMap = new HashMap<>();
    Set<String> processedTsConfigFiles = new HashSet<>();
    List<String> originalTsConfigFiles = new ArrayList<>();
    Deque<String> pendingTsConfigFiles = new ArrayDeque<>();
    boolean initialized = false;


    TsConfigFile getTsConfigForInputFile(InputFile inputFile) {
      var inputFilePath = TsConfigFile.normalizePath(inputFile.absolutePath());
      if (!initialized) {
        LOG.error("TsConfigCacheImpl is not initialized for file {}", inputFilePath);
        return null;
      }
      if (inputFileToTsConfigFilesMap.containsKey(inputFilePath)) {
        return inputFileToTsConfigFilesMap.get(inputFilePath);
      }

      while (!pendingTsConfigFiles.isEmpty()) {
        var tsConfigPath = pendingTsConfigFiles.pop();
        processedTsConfigFiles.add(tsConfigPath);
        LOG.debug("Computing tsconfig {} from bridge", tsConfigPath);
        TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(tsConfigPath);
        tsConfigFile.getFiles().forEach(file -> inputFileToTsConfigFilesMap.putIfAbsent(TsConfigFile.normalizePath(file), tsConfigFile));
        if (!tsConfigFile.getProjectReferences().isEmpty()) {
          LOG.debug("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
          pendingTsConfigFiles.addAll(tsConfigFile.getProjectReferences().stream().filter(refPath -> !processedTsConfigFiles.contains(refPath)).toList());
        }
        if (inputFileToTsConfigFilesMap.containsKey(inputFilePath)) {
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
      processedTsConfigFiles = new HashSet<>();
      pendingTsConfigFiles = new ArrayDeque<>(originalTsConfigFiles);
    }
  }

  Map<TsConfigProvider.CacheOrigin, Cache> cacheMap = new HashMap<>();

  TsConfigCacheImpl(BridgeServer bridgeServer) {
    this.bridgeServer = bridgeServer;
    cacheMap.put(TsConfigProvider.CacheOrigin.PROPERTY, new Cache());
    cacheMap.put(TsConfigProvider.CacheOrigin.LOOKUP, new Cache());
    cacheMap.put(TsConfigProvider.CacheOrigin.FALLBACK, new Cache());
  }

  public TsConfigProvider.CacheOrigin getOrigin() {
    return origin;
  }

  public TsConfigFile getTsConfigForInputFile(InputFile inputFile) {
    if (origin == null) {
      return null;
    }
    return cacheMap.get(origin).getTsConfigForInputFile(inputFile);
  }

  public @Nullable List<String> listCachedTsConfigs(TsConfigProvider.CacheOrigin cacheOrigin) {
    var currentCache = cacheMap.get(cacheOrigin);

    if (currentCache.initialized) {
      LOG.debug("TsConfigCache is already initialized");
      return currentCache.originalTsConfigFiles;
    }
    return null;
  }

  public void setOrigin(TsConfigProvider.CacheOrigin cacheOrigin) {
    origin = cacheOrigin;
  }

  public void initializeWith(List<String> tsConfigPaths, TsConfigProvider.CacheOrigin cacheOrigin) {
    var cache = cacheMap.get(cacheOrigin);
    if (cacheOrigin == TsConfigProvider.CacheOrigin.FALLBACK && cache.initialized) {
      return;
    }
    if (cacheOrigin != TsConfigProvider.CacheOrigin.FALLBACK && cache.originalTsConfigFiles.equals(tsConfigPaths)) {
      return;
    }

    LOG.debug("Resetting the TsConfigCache {}", cacheOrigin);
    cache.initializeOriginalTsConfigs(tsConfigPaths);
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var file = moduleFileEvent.getTarget();
    var filename = file.absolutePath();
    // Look for any event on files named *tsconfig*.json
    // Filenames other than tsconfig.json can be discovered through references
    if (filename.endsWith("json") && filename.contains("tsconfig")) {
      LOG.debug("Clearing tsconfig cache");
      cacheMap.get(TsConfigProvider.CacheOrigin.LOOKUP).clearAll();
      if (cacheMap.get(TsConfigProvider.CacheOrigin.PROPERTY).processedTsConfigFiles.contains(filename)) {
        cacheMap.get(TsConfigProvider.CacheOrigin.PROPERTY).clearAll();
      }
    } else if (moduleFileEvent.getType() == ModuleFileEvent.Type.CREATED && (JavaScriptFilePredicate.isJavaScriptFile(file) || JavaScriptFilePredicate.isTypeScriptFile(file))) {
      // if there is a new file, we need to know to which tsconfig it belongs to
      cacheMap.values().forEach(Cache::clearFileToTsConfigCache);
    }
  }
}
