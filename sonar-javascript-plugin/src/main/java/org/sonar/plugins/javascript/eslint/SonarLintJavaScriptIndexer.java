/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonarsource.api.sonarlint.SonarLintSide;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileListener;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileSystem;

import static java.util.stream.Collectors.toList;

@SonarLintSide(lifespan = "MODULE")
public class SonarLintJavaScriptIndexer implements ModuleFileListener, JavaScriptIndexer {

  private static final Logger LOG = Loggers.get(SonarLintJavaScriptIndexer.class);

  private final ModuleFileSystem moduleFileSystem;
  private final Map<String, InputFile> indexedFiles = new LinkedHashMap<>();

  private boolean shouldBuild = true;

  public SonarLintJavaScriptIndexer(ModuleFileSystem moduleFileSystem) {
    this.moduleFileSystem = moduleFileSystem;
  }

  @Override
  public List<InputFile> getIndexedFiles() {
    return List.copyOf(indexedFiles.values());
  }

  @Override
  public void buildOnce(SensorContext context) {
    if (shouldBuild) {
      buildIndex(context);
      shouldBuild = false;
    }
  }

  private void buildIndex(SensorContext context) {
    getInputFiles(context).forEach(this::addInputFile);
    LOG.debug("Input files for indexing: " + indexedFiles.values().stream().map(InputFile::filename).collect(toList()));
  }

  private static String key(InputFile inputFile) {
    return Path.of(inputFile.uri()).toAbsolutePath().toString();
  }

  private Stream<InputFile> getInputFiles(SensorContext context) {
    var predicate = JavaScriptFilePredicate.getJavaScriptPredicate(context.fileSystem());
    return moduleFileSystem.files().filter(predicate::apply);
  }

  @Override
  public void process(ModuleFileEvent moduleFileEvent) {
    var eventType = moduleFileEvent.getType();
    var target = moduleFileEvent.getTarget();

    var language = target.language();
    if (language == null || !language.equals(JavaScriptLanguage.KEY) || eventType.equals(ModuleFileEvent.Type.MODIFIED)) {
      return;
    }

    if (eventType.equals(ModuleFileEvent.Type.DELETED)) {
      LOG.debug("Removing file from index: " + target.filename());
      removeInputFile(target);
    }
    if (eventType.equals(ModuleFileEvent.Type.CREATED)) {
      LOG.debug("Adding file from index: " + target.filename());
      addInputFile(target);
    }
  }

  private void addInputFile(InputFile inputFile) {
    indexedFiles.put(key(inputFile), inputFile);
  }

  private void removeInputFile(InputFile target) {
    indexedFiles.remove(key(target));
  }

}
