package org.sonar.plugins.javascript.analysis;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

import java.util.List;

public interface TsConfigCache extends TsConfigProvider.Provider, ModuleFileListener {
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
  void initializeWith(List<String> tsConfigs);
}
