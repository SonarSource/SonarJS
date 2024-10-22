package org.sonar.plugins.javascript.analysis;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;

public interface TsConfigCache extends ModuleFileListener {
  TsConfigProvider.CacheOrigin getOrigin();
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
  void initializeWith(List<String> tsConfigs, TsConfigProvider.CacheOrigin origin);
  List<String> listCachedTsConfigs();
}
