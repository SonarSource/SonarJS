package org.sonar.plugins.javascript.analysis;

import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

import java.util.List;

public interface TsConfigCache extends TsConfigProvider.Provider {
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
  void initializeWith(List<String> tsConfigs);
}
