package main

import (
	"log"
	"strings"

	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/microsoft/typescript-go/shim/core"
)

func logDiscoveredTSConfigs(tsconfigs []string) {
	log.Printf("Found %d tsconfig.json file(s): [%s]", len(tsconfigs), strings.Join(tsconfigs, ", "))
}

func logOrphanProgramAnalysis(fileCount int, label string, options *core.CompilerOptions) {
	log.Printf(
		"Analyzing %d file(s) using %s [lib: %s]",
		fileCount,
		label,
		strings.Join(compilerOptionLibs(options), ", "),
	)
}

func logTypeCheckingDisabled() {
	log.Printf(
		"Type checking is disabled (sonar.javascript.disableTypeChecking=true). All files will be analyzed without type information.",
	)
}

func logConfiguredProgramCreation(configFileName string, program *compiler.Program) {
	log.Printf(
		"Creating TypeScript(%s) program with configuration file %s [lib: %s]",
		core.Version(),
		configFileName,
		strings.Join(programOptionLibs(program), ", "),
	)
}

func logConfiguredProgramAnalysis(configFileName string, fileCount int, program *compiler.Program) {
	if fileCount == 0 {
		log.Printf("No files to analyze from tsconfig %s", configFileName)
		return
	}

	totalFiles := 0
	if program != nil {
		totalFiles = len(program.GetSourceFiles())
	}
	log.Printf(
		"Analyzing %d file(s) from tsconfig %s (%d total files in program)",
		fileCount,
		configFileName,
		totalFiles,
	)
}

func logSkippingOrphanProgramCreation(fileCount int) {
	log.Printf(
		"Skipping TypeScript program creation for %d orphan file(s) (sonar.javascript.createTSProgramForOrphanFiles=false)",
		fileCount,
	)
}

func compilerOptionLibs(options *core.CompilerOptions) []string {
	if options == nil {
		return nil
	}
	return append([]string(nil), options.Lib...)
}

func programOptionLibs(program *compiler.Program) []string {
	if program == nil {
		return nil
	}
	return compilerOptionLibs(program.Options())
}

func orphanCompilerOptionsLabel(options *core.CompilerOptions) string {
	if options == nil {
		return "default options"
	}
	return "merged compiler options"
}
