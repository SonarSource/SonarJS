package org.sonar.plugins.javascript.bridge;

import java.io.File;
import java.io.IOException;
import java.io.Serializable;
import java.io.UncheckedIOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;
import java.util.SortedSet;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarProduct;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputModule;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.cache.ReadCache;
import org.sonar.api.batch.sensor.cache.WriteCache;
import org.sonar.api.batch.sensor.code.NewSignificantCode;
import org.sonar.api.batch.sensor.coverage.NewCoverage;
import org.sonar.api.batch.sensor.cpd.NewCpdTokens;
import org.sonar.api.batch.sensor.error.NewAnalysisError;
import org.sonar.api.batch.sensor.highlighting.NewHighlighting;
import org.sonar.api.batch.sensor.issue.NewExternalIssue;
import org.sonar.api.batch.sensor.issue.NewIssue;
import org.sonar.api.batch.sensor.measure.NewMeasure;
import org.sonar.api.batch.sensor.rule.NewAdHocRule;
import org.sonar.api.batch.sensor.symbol.NewSymbolTable;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.Settings;
import org.sonar.api.scanner.fs.InputProject;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

public class Parser implements AutoCloseable {

  private final BridgeServerImpl bridge;

  public Parser() {
    var processWrapper = new ProcessWrapperImpl();
    bridge = new BridgeServerImpl(new NodeCommandBuilderImpl(processWrapper), new BundleImpl(), new RulesBundles(),
      new NodeDeprecationWarning(new AnalysisWarningsWrapper()), new TempFolder(), new EmbeddedNode(processWrapper, new Environment(new EmptyConfiguration())));
    try {
      bridge.startServerLazily(new Context());
      bridge.initLinter(List.of(), List.of(), List.of(), AnalysisMode.DEFAULT, null, List.of());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  public String parse(String code) {
    var req = new BridgeServer.JsAnalysisRequest("file.js", "MAIN", "js", code, true, null, null, AnalysisMode.DEFAULT_LINTER_ID);
    try {
      var res = bridge.analyzeJavaScript(req);
      return res.ast;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public void close() throws Exception {

  }
}

class TempFolder implements org.sonar.api.utils.TempFolder {

  @Override
  public File newDir() {
   return newDir("sonarjs");
  }

  @Override
  public File newDir(String name) {
    try {
      return Files.createTempDirectory(name).toFile();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public File newFile() {
    return newFile(null, null);
  }

  @Override
  public File newFile(@Nullable String prefix, @Nullable String suffix) {
    try {
      return Files.createTempFile(prefix, suffix).toFile();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}

class EmptyConfiguration implements org.sonar.api.config.Configuration {

  @Override
  public Optional<String> get(String key) {
    return Optional.empty();
  }

  @Override
  public boolean hasKey(String key) {
    return false;
  }

  @Override
  public String[] getStringArray(String key) {
    return new String[0];
  }
}

class Context implements SensorContext {

  @Override
  public Settings settings() {
    return null;
  }

  @Override
  public Configuration config() {
    return new EmptyConfiguration();
  }

  @Override
  public boolean canSkipUnchangedFiles() {
    return false;
  }

  @Override
  public FileSystem fileSystem() {
    return new FileSystem();
  }

  @Override
  public ActiveRules activeRules() {
    return null;
  }

  @Override
  public InputModule module() {
    return null;
  }

  @Override
  public InputProject project() {
    return null;
  }

  @Override
  public Version getSonarQubeVersion() {
    return null;
  }

  @Override
  public SonarRuntime runtime() {
    return new SonarRuntime() {
      @Override
      public Version getApiVersion() {
        return Version.create(99, 0);
      }

      @Override
      public SonarProduct getProduct() {
        return SonarProduct.SONARQUBE;
      }

      @Override
      public SonarQubeSide getSonarQubeSide() {
        return SonarQubeSide.SCANNER;
      }

      @Override
      public SonarEdition getEdition() {
        return SonarEdition.ENTERPRISE;
      }
    };
  }

  @Override
  public boolean isCancelled() {
    return false;
  }

  @Override
  public <G extends Serializable> NewMeasure<G> newMeasure() {
    return null;
  }

  @Override
  public NewIssue newIssue() {
    return null;
  }

  @Override
  public NewExternalIssue newExternalIssue() {
    return null;
  }

  @Override
  public NewAdHocRule newAdHocRule() {
    return null;
  }

  @Override
  public NewHighlighting newHighlighting() {
    return null;
  }

  @Override
  public NewSymbolTable newSymbolTable() {
    return null;
  }

  @Override
  public NewCoverage newCoverage() {
    return null;
  }

  @Override
  public NewCpdTokens newCpdTokens() {
    return null;
  }

  @Override
  public NewAnalysisError newAnalysisError() {
    return null;
  }

  @Override
  public NewSignificantCode newSignificantCode() {
    return null;
  }

  @Override
  public void addContextProperty(String key, String value) {

  }

  @Override
  public void markForPublishing(InputFile inputFile) {

  }

  @Override
  public void markAsUnchanged(InputFile inputFile) {

  }

  @Override
  public WriteCache nextCache() {
    return null;
  }

  @Override
  public ReadCache previousCache() {
    return null;
  }

  @Override
  public boolean isCacheEnabled() {
    return false;
  }
}

class FileSystem implements org.sonar.api.batch.fs.FileSystem {

  @Override
  public File baseDir() {
    return null;
  }

  @Override
  public Charset encoding() {
    return null;
  }

  @Override
  public File workDir() {
    return new File(".");
  }

  @Override
  public FilePredicates predicates() {
    return null;
  }

  @CheckForNull
  @Override
  public InputFile inputFile(FilePredicate predicate) {
    return null;
  }

  @CheckForNull
  @Override
  public InputDir inputDir(File dir) {
    return null;
  }

  @Override
  public Iterable<InputFile> inputFiles(FilePredicate predicate) {
    return null;
  }

  @Override
  public boolean hasFiles(FilePredicate predicate) {
    return false;
  }

  @Override
  public Iterable<File> files(FilePredicate predicate) {
    return null;
  }

  @Override
  public SortedSet<String> languages() {
    return null;
  }

  @Override
  public File resolvePath(String path) {
    return null;
  }
}
