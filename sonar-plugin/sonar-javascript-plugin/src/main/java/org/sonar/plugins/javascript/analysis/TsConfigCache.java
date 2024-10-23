package org.sonar.plugins.javascript.analysis;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

public interface TsConfigCache {
  TsConfigProvider.CacheOrigin getOrigin();
  TsConfigFile getTsConfigForInputFile(InputFile inputFile);
  void initializeWith(List<String> tsConfigs, TsConfigProvider.CacheOrigin origin);
  List<String> listCachedTsConfigs(TsConfigProvider.CacheOrigin origin);
  void setOrigin(TsConfigProvider.CacheOrigin origin);
}
