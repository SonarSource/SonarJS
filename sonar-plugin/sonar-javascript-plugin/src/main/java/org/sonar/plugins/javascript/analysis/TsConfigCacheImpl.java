package org.sonar.plugins.javascript.analysis;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

import java.util.*;

import static java.util.Collections.emptyList;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class TsConfigCacheImpl implements TsConfigCache, ModuleFileListener, TsConfigProvider.Provider {
  private static final Logger LOG = LoggerFactory.getLogger(TsConfigCache.class);
  Map<String, TsConfigFile> tsConfigFilesMap = new HashMap<>();
  BridgeServer bridgeServer;
  boolean initialized;
  public static final TsConfigFile UNMATCHED_CONFIG = new TsConfigFile(
    "NO_CONFIG",
    emptyList(),
    emptyList()
  );
  TsConfigCacheImpl(BridgeServer bridgeServer) {
    this.bridgeServer = bridgeServer;
    this.initialized = false;
  }

  public Map<TsConfigFile, List<InputFile>> inputFilesByTsConfigPath(List<String> tsConfigPaths, List<InputFile> inputFiles) {
    var tsConfigFiles = loadTsConfigs(tsConfigPaths);
    return inputFilesByTsConfig(tsConfigFiles, inputFiles);
  }

  @Override
  public List<String> tsconfigs(SensorContext context) {
    if (initialized) {
      LOG.info("TsConfigCache is already initialized");
      return tsConfigFilesMap.keySet().stream().toList();
    }

    var tsconfigs = TsConfigProvider.lookupTsConfigs(context);
    for (var tsConfigFile : tsconfigs) {
      tsConfigFilesMap.put(tsConfigFile, null);
    }
    initialized = true;
    LOG.info("TsConfigCache initialized");
    return tsconfigs;
  }

  private List<TsConfigFile> loadTsConfigs(List<String> tsConfigPaths) {
    List<TsConfigFile> tsConfigFiles = new ArrayList<>();
    Deque<String> workList = new ArrayDeque<>(tsConfigPaths);
    while (!workList.isEmpty()) {
      String path = workList.pop();
      if (!tsConfigFilesMap.containsKey(path) || tsConfigFilesMap.get(path) == null) {
        LOG.info("Computing tsconfig {} from bridge", path);
        TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(path);
        tsConfigFilesMap.put(path, tsConfigFile);
        if (!tsConfigFile.getProjectReferences().isEmpty()) {
          LOG.info("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
          workList.addAll(tsConfigFile.getProjectReferences().stream().filter(ref -> !tsConfigFilesMap.containsKey(ref)).toList());
        }
      }
      tsConfigFiles.add(tsConfigFilesMap.get(path));
    }
    return tsConfigFiles;
  }

  public static Map<TsConfigFile, List<InputFile>> inputFilesByTsConfig(
    List<TsConfigFile> tsConfigFiles,
    List<InputFile> inputFiles
  ) {
    Map<TsConfigFile, List<InputFile>> result = new LinkedHashMap<>();
    inputFiles.forEach(inputFile -> {
      TsConfigFile tsconfig = tsConfigFiles
        .stream()
        .filter(tsConfigFile -> tsConfigFile.test(inputFile))
        .findFirst()
        .orElse(UNMATCHED_CONFIG);
      LOG.info("{} matched {}", inputFile, tsconfig);
      result.computeIfAbsent(tsconfig, t -> new ArrayList<>()).add(inputFile);
    });
    return result;
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var filename = moduleFileEvent.getTarget().absolutePath();
    if (filename.endsWith("json") && filename.contains("tsconfig")) {
      LOG.info("Clearing tsconfig cache");
      this.initialized = false;
      this.tsConfigFilesMap.clear();
    }
  }
}