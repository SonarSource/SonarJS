/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
package org.sonar.javascript;

import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.squid.AstScanner;
import com.sonar.sslr.squid.SquidAstVisitor;
import com.sonar.sslr.squid.SquidAstVisitorContextImpl;
import org.sonar.sslr.parser.LexerlessGrammar;

import javax.annotation.Nullable;
import java.io.File;
import java.util.Collection;
import java.util.concurrent.TimeUnit;

public class ProgressAstScanner extends AstScanner<LexerlessGrammar> {

  private final ProgressReport progressReport;

  protected ProgressAstScanner(Builder builder) {
    super(builder);
    this.progressReport = builder.progressReport;
  }

  @Override
  public void scanFiles(Collection<File> files) {
    progressReport.start(files.size());
    super.scanFiles(files);
    progressReport.stop();
  }

  public static class Builder extends AstScanner.Builder<LexerlessGrammar> {

    private final ProgressReport progressReport = new ProgressReport("Report about progress of ActionScript analyzer", TimeUnit.SECONDS.toMillis(10));

    public Builder(SquidAstVisitorContextImpl<LexerlessGrammar> context) {
      super(context);
    }

    @Override
    public AstScanner<LexerlessGrammar> build() {
      super.withSquidAstVisitor(new SquidAstVisitor<LexerlessGrammar>() {
        @Override
        public void visitFile(@Nullable AstNode astNode) {
          progressReport.nextFile(getContext().getFile());
        }
      });
      return new ProgressAstScanner(this);
    }

  }

}
