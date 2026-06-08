package main

import (
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/tsoptions"
)

var compilerOptionsType = reflect.TypeOf(core.CompilerOptions{})
var nodeMajorPattern = regexp.MustCompile(`(\d+)(?:\.\d+)*`)

type compilerOptionsAccumulator struct {
	ordered []*core.CompilerOptions
}

func newCompilerOptionsAccumulator() *compilerOptionsAccumulator {
	return &compilerOptionsAccumulator{}
}

func (a *compilerOptionsAccumulator) add(options *core.CompilerOptions) {
	if a == nil || options == nil {
		return
	}
	a.ordered = append(a.ordered, options.Clone())
}

func (a *compilerOptionsAccumulator) merged() *core.CompilerOptions {
	if a == nil || len(a.ordered) == 0 {
		return nil
	}

	merged := &core.CompilerOptions{}
	for _, options := range a.ordered {
		mergeCompilerOptions(merged, options)
	}
	return merged
}

func mergeCompilerOptions(target *core.CompilerOptions, source *core.CompilerOptions) {
	if target == nil || source == nil {
		return
	}

	sourceValue := reflect.ValueOf(source).Elem()
	targetValue := reflect.ValueOf(target).Elem()
	for index := range sourceValue.NumField() {
		if !compilerOptionsType.Field(index).IsExported() {
			continue
		}

		value := sourceValue.Field(index)
		if value.IsZero() {
			continue
		}

		targetValue.Field(index).Set(cloneCompilerOptionFieldValue(value))
	}
}

func cloneCompilerOptionFieldValue(value reflect.Value) reflect.Value {
	switch value.Kind() {
	case reflect.Slice:
		if value.IsNil() {
			return value
		}
		cloned := reflect.MakeSlice(value.Type(), value.Len(), value.Len())
		reflect.Copy(cloned, value)
		return cloned
	default:
		return value
	}
}

func cloneCompilerOptions(options *core.CompilerOptions) *core.CompilerOptions {
	if options == nil {
		return nil
	}
	return options.Clone()
}

func compilerOptionsEqual(left *core.CompilerOptions, right *core.CompilerOptions) bool {
	return reflect.DeepEqual(left, right)
}

func buildInferredCompilerOptions(
	config NormalizedProjectConfiguration,
	discovered *core.CompilerOptions,
	nodeVersionSignal string,
) *core.CompilerOptions {
	if discovered == nil {
		return &core.CompilerOptions{
			AllowJs:       core.TSTrue,
			NoImplicitAny: core.TSTrue,
			Strict:        core.TSFalse,
			Lib:           computedLibFiles(config.EcmaScriptVersion, core.ScriptTargetNone, nodeVersionSignal),
		}
	}

	merged := discovered.Clone()
	if len(merged.Lib) == 0 {
		merged.Lib = computedLibFiles(config.EcmaScriptVersion, merged.Target, nodeVersionSignal)
	}
	return merged
}

func computedLibFiles(
	ecmaScriptVersion *string,
	target core.ScriptTarget,
	nodeVersionSignal string,
) []string {
	if year := configuredEcmaScriptYear(ecmaScriptVersion); year != 0 {
		return libFilesForEcmaYear(year)
	}

	maxYear := 0
	if year := ecmaYearFromScriptTarget(target); year > maxYear {
		maxYear = year
	}
	if year := nodeSignalEcmaYear(nodeVersionSignal); year > maxYear {
		maxYear = year
	}
	if maxYear != 0 {
		return libFilesForEcmaYear(maxYear)
	}
	return []string{mustLibFileName("esnext"), mustLibFileName("dom")}
}

func libFilesForEcmaYear(year int) []string {
	return []string{mustLibFileName("es" + strconv.Itoa(year)), mustLibFileName("dom")}
}

func mustLibFileName(name string) string {
	if fileName, ok := tsoptions.GetLibFileName(name); ok {
		return fileName
	}
	return "lib.esnext.d.ts"
}

func parseMaxNodeMajor(versionStr string) (int, bool) {
	trimmed := strings.TrimSpace(versionStr)
	if trimmed == "" || trimmed == "*" || strings.EqualFold(trimmed, "latest") {
		return 0, false
	}

	maxMajor := 0
	for _, match := range nodeMajorPattern.FindAllStringSubmatch(trimmed, -1) {
		major, err := strconv.Atoi(match[1])
		if err != nil || major < 8 || major >= 100 {
			continue
		}
		if major > maxMajor {
			maxMajor = major
		}
	}

	if maxMajor == 0 {
		return 0, false
	}
	return maxMajor, true
}

func nodeSignalEcmaYear(signal string) int {
	major, ok := parseMaxNodeMajor(signal)
	if !ok {
		return 0
	}
	return nodeMajorToEcmaYear(major)
}

func nodeMajorToEcmaYear(major int) int {
	switch {
	case major >= 22:
		return 2024
	case major >= 20:
		return 2023
	case major >= 18:
		return 2022
	case major >= 16:
		return 2021
	case major >= 14:
		return 2020
	case major >= 12:
		return 2019
	case major >= 10:
		return 2018
	default:
		return 2017
	}
}

func ecmaYearFromScriptTarget(target core.ScriptTarget) int {
	switch target {
	case core.ScriptTargetES5:
		return 2020
	case core.ScriptTargetES2015:
		return 2015
	case core.ScriptTargetES2016:
		return 2016
	case core.ScriptTargetES2017:
		return 2017
	case core.ScriptTargetES2018:
		return 2018
	case core.ScriptTargetES2019:
		return 2019
	case core.ScriptTargetES2020:
		return 2020
	case core.ScriptTargetES2021:
		return 2021
	case core.ScriptTargetES2022:
		return 2022
	case core.ScriptTargetES2023:
		return 2023
	case core.ScriptTargetES2024:
		return 2024
	case core.ScriptTargetES2025:
		return 2025
	default:
		return 0
	}
}
