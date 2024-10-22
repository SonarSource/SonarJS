package org.sonar.plugins.javascript.analysis;


import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class TsConfigCacheImpl implements TsConfigCache {
  private static final Logger LOG = LoggerFactory.getLogger(TsConfigCacheImpl.class);
  Map<String, TsConfigFile> inputFileToTsConfigFilesMap = new HashMap<>();
  Set<String> processedTsConfigFiles = new HashSet<>();
  List<String> originalTsConfigFiles = new ArrayList<>();
  Deque<String> pendingTsConfigFiles = new ArrayDeque<>();

  BridgeServer bridgeServer;
  boolean initialized;
  TsConfigCacheImpl(BridgeServer bridgeServer) {
    this.bridgeServer = bridgeServer;
    this.initialized = false;
  }

  public TsConfigFile getTsConfigForInputFile(InputFile inputFile) {
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
      LOG.info("Computing tsconfig {} from bridge", tsConfigPath);
      TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(tsConfigPath);
      tsConfigFile.getFiles().forEach(file -> inputFileToTsConfigFilesMap.putIfAbsent(TsConfigFile.normalizePath(file), tsConfigFile));
      if (!tsConfigFile.getProjectReferences().isEmpty()) {
        LOG.info("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
        pendingTsConfigFiles.addAll(tsConfigFile.getProjectReferences().stream().filter(refPath -> !processedTsConfigFiles.contains(refPath)).toList());
      }
      if (inputFileToTsConfigFilesMap.containsKey(inputFilePath)) {
        return inputFileToTsConfigFilesMap.get(inputFilePath);
      }
    }
    inputFileToTsConfigFilesMap.put(inputFilePath, null);
    return null;
  }

  @Override
  public List<String> tsconfigs(SensorContext context) {
    if (initialized) {
      LOG.info("TsConfigCache is already initialized");
      return originalTsConfigFiles;
    }
    return List.of();
  }

  public void initializeWith(List<String> tsConfigPaths) {
    if (tsConfigPaths.equals(originalTsConfigFiles)) {
      return;
    }

    LOG.info("Resetting the TsConfigCache");
    inputFileToTsConfigFilesMap.clear();
    originalTsConfigFiles = tsConfigPaths;
    pendingTsConfigFiles = new ArrayDeque<>(originalTsConfigFiles);
    processedTsConfigFiles.clear();

    initialized = true;
    LOG.info("TsConfigCache initialized");
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var filename = moduleFileEvent.getTarget().absolutePath();
    // Look for any event on files named *tsconfig*.json
    // Filenames other than tsconfig.json can be discovered through references
    if (filename.endsWith("json") && filename.contains("tsconfig")) {
      LOG.info("Clearing tsconfig cache");
      initialized = false;
      inputFileToTsConfigFilesMap.clear();
      pendingTsConfigFiles.clear();
      processedTsConfigFiles.clear();
    }
  }
}
