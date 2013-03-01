/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript;

import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.configuration.Configuration;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.sonar.api.CoreProperties;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.utils.ReportScanner;

public class TestUtils {
  
  public static File loadResource(String resourceName) {
    URL resource = TestUtils.class.getResource(resourceName);
    File resourceAsFile = null;
    try{
      resourceAsFile = new File(resource.toURI());
    } catch (URISyntaxException e) {
      System.out.println("Cannot load resource: " + resourceName);
    }
    
    return resourceAsFile;
  }

  /**
   * @return  default mock project
   */
  public static Project mockProject() {
    File baseDir;
    baseDir = loadResource("/org/sonar/plugins/javascript/");  //we skip "SampleProject" dir because report dirs as here
    
    List<File> sourceDirs = new ArrayList<File>();
    sourceDirs.add(loadResource("/org/sonar/plugins/javascript/SampleProject/sources/") );
    
    List<File> testDirs = new ArrayList<File>();      
    testDirs.add(loadResource("/org/sonar/plugins/javascript/SampleProject/tests/"));
    
    return mockProject(baseDir, sourceDirs, testDirs);
  }
  
  /**
   * Mock project
   * @param baseDir project base dir
   * @param sourceFiles project source files
   * @return  mocked project
   */
  public static Project mockProject(File baseDir, List<File> sourceDirs, List<File> testDirs) {
    List<File> mainSourceFiles = scanForSourceFiles(sourceDirs);
    List<File> testSourceFiles = scanForSourceFiles(testDirs);
    
    List<InputFile> mainFiles = fromSourceFiles(mainSourceFiles);
    List<InputFile> testFiles = fromSourceFiles(testSourceFiles);
    
    ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getBasedir()).thenReturn(baseDir);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());
    when(fileSystem.getSourceFiles(mockJavaScriptLanguage())).thenReturn(mainSourceFiles);
    when(fileSystem.getTestFiles(mockJavaScriptLanguage())).thenReturn(testSourceFiles);
    when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(mainFiles);
    when(fileSystem.testFiles(JavaScript.KEY)).thenReturn(testFiles);
    when(fileSystem.getSourceDirs()).thenReturn(sourceDirs);
    when(fileSystem.getTestDirs()).thenReturn(testDirs);

    Project project = mock(Project.class);
    when(project.getFileSystem()).thenReturn(fileSystem);
    JavaScript lang = mockJavaScriptLanguage();
    when(project.getLanguage()).thenReturn(lang);
    when(project.getLanguageKey()).thenReturn(lang.getKey());
    // only for testing, Configuration is deprecated

    Configuration configuration = mock(Configuration.class);
	    when(configuration.getBoolean(CoreProperties.CORE_IMPORT_SOURCES_PROPERTY,
	        CoreProperties.CORE_IMPORT_SOURCES_DEFAULT_VALUE)).thenReturn(true);
	    when(project.getConfiguration()).thenReturn(configuration);
	    
	    return project;
	  }

	  private static List<InputFile> fromSourceFiles(List<File> sourceFiles){
	    List<InputFile> result = new ArrayList<InputFile>();
	    for(File file: sourceFiles) {
	      InputFile inputFile = mock(InputFile.class);
	      when(inputFile.getFile()).thenReturn(new File(file, ""));
	      result.add(inputFile);
	    }
	    return result;
	  }

	  public static JavaScript mockJavaScriptLanguage(){
	    return new JavaScript(new Settings());
	  }
	  
	  private static List<File> scanForSourceFiles(List<File> sourceDirs){
	    List<File> result = new ArrayList<File>();
	    String[] suffixes = mockJavaScriptLanguage().getFileSuffixes();
	    String[] includes = new String[ suffixes.length ];
	    for(int i = 0; i < includes.length; ++i) {
	      includes[i] = "**/*." + suffixes[i];
	    }
	
	    for(File baseDir : sourceDirs) {
        result.addAll(ReportScanner.scanForReports(baseDir, includes));
	    }
	    return result;
	  }

}
