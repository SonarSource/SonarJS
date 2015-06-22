/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.ast.visitors;

import com.sonar.sslr.api.AstNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.config.Settings;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.ast.resolve.SymbolModelImpl;
import org.sonar.javascript.highlighter.SourceFileOffsets;
import org.sonar.plugins.javascript.api.JavaScriptFileScanner;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.squidbridge.SquidAstVisitor;
import org.sonar.squidbridge.api.SourceFile;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.io.File;
import java.util.List;

public class VisitorsBridge extends SquidAstVisitor<LexerlessGrammar> {

  private final List<JavaScriptFileScanner> scanners;
  private final ResourcePerspectives resourcePerspectives;
  private final FileSystem fs;
  private static final Logger LOG = LoggerFactory.getLogger(VisitorsBridge.class);
  private final Settings settings;

  public VisitorsBridge(List<JavaScriptFileScanner> visitors, @Nullable ResourcePerspectives resourcePerspectives, FileSystem fs, Settings settings) {
    this.scanners = visitors;
    this.resourcePerspectives = resourcePerspectives;
    this.fs = fs;
    this.settings = settings;
  }

  @Override
  public void visitFile(@Nullable AstNode astNode) {
    if (astNode != null) {
      ScriptTree scriptTree = (ScriptTree) astNode;
      File file = getContext().getFile();
      SymbolModelImpl symbolModel = SymbolModelImpl.create(scriptTree, symbolizableFor(file), new SourceFileOffsets(file, fs.encoding()), settings);

      for (JavaScriptFileScanner scanner : scanners) {
        scanner.scanFile(new AstTreeVisitorContextImpl(
          scriptTree,
          (SourceFile) getContext().peekSourceCode(),
          file,
          symbolModel,
          settings
        ));
      }
    }
  }

  @Nullable
  private Symbolizable symbolizableFor(File file) {
    if (resourcePerspectives == null) {
      return null;
    }

    InputFile inputFile = fs.inputFile(fs.predicates().hasAbsolutePath(file.getAbsolutePath()));

    if (inputFile != null) {
      return resourcePerspectives.as(Symbolizable.class, inputFile);

    } else {
      LOG.warn("No symbol highlighting for file: " + file.getPath() + ". Unable to find associate SonarQube resource.");
      return null;
    }
  }

}
