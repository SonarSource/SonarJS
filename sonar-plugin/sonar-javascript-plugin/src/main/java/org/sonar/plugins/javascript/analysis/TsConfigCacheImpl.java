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
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MODULE)
public class TsConfigCacheImpl implements TsConfigCache, ModuleFileListener, TsConfigProvider.Provider {
  private static final Logger LOG = LoggerFactory.getLogger(TsConfigCacheImpl.class);
  Map<String, TsConfigFile> inputFileTotsConfigFilesMap = new HashMap<>();
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
    if (!initialized) {
      LOG.error("TsConfigCache not yet initialized. Cannot load tsconfig.");
      return null;
    }
    var inputFilePath = TsConfigFile.normalizePath(inputFile.absolutePath());
    if (inputFileTotsConfigFilesMap.containsKey(inputFilePath)) {
      return inputFileTotsConfigFilesMap.get(inputFilePath);
    }

    while (!pendingTsConfigFiles.isEmpty()) {
      var tsConfigPath = pendingTsConfigFiles.pop();
      processedTsConfigFiles.add(tsConfigPath);
      LOG.info("Computing tsconfig {} from bridge", tsConfigPath);
      TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(tsConfigPath);
      tsConfigFile.getFiles().forEach(file -> inputFileTotsConfigFilesMap.putIfAbsent(TsConfigFile.normalizePath(file), tsConfigFile));
      if (!tsConfigFile.getProjectReferences().isEmpty()) {
        LOG.info("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
        pendingTsConfigFiles.addAll(tsConfigFile.getProjectReferences().stream().filter(refPath -> !processedTsConfigFiles.contains(refPath)).toList());
      }
      if (inputFileTotsConfigFilesMap.containsKey(inputFilePath)) {
        return inputFileTotsConfigFilesMap.get(inputFilePath);
      }
    }
    inputFileTotsConfigFilesMap.put(inputFilePath, null);
    return null;
  }

  @Override
  public List<String> tsconfigs(SensorContext context) {
    if (initialized) {
      LOG.info("TsConfigCache is already initialized");
      return originalTsConfigFiles;
    }

    originalTsConfigFiles = TsConfigProvider.lookupTsConfigs(context);
    pendingTsConfigFiles = new ArrayDeque<>(originalTsConfigFiles);

    initialized = true;
    LOG.info("TsConfigCache initialized");
    return originalTsConfigFiles;
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var filename = moduleFileEvent.getTarget().absolutePath();
    if (filename.endsWith("json") && filename.contains("tsconfig")) {
      LOG.info("Clearing tsconfig cache");
      initialized = false;
      inputFileTotsConfigFilesMap.clear();
      pendingTsConfigFiles.clear();
      originalTsConfigFiles.clear();
    }
  }
}
