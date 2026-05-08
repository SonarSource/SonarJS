package main

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"

	"github.com/microsoft/typescript-go/shim/tspath"
)

const (
	moduleTypeModule    = "module"
	moduleTypeCommonJS  = "commonjs"
	definitelyTypedPref = "@types/"
)

var denoNpmImportPattern = regexp.MustCompile(`^(@[^/]+/[^/@]+|[^/@]+)(?:@([^/]+))?(?:/.*)?$`)

type ruleMetadata struct {
	DefaultOptionsJSON   string
	RequiredDependencies []string
	RequiredModuleType   string
	RequiredEcmaVersion  int
}

type ruleActivationSignals struct {
	Dependencies        map[string]struct{}
	DetectedModuleType  string
	DetectedEcmaVersion int
}

type rawPackageJSONManifest struct {
	Name                 string         `json:"name"`
	Type                 string         `json:"type"`
	Dependencies         map[string]any `json:"dependencies"`
	DevDependencies      map[string]any `json:"devDependencies"`
	PeerDependencies     map[string]any `json:"peerDependencies"`
	OptionalDependencies map[string]any `json:"optionalDependencies"`
	ModuleAliases        map[string]any `json:"_moduleAliases"`
	Engines              map[string]any `json:"engines"`
}

type rawDenoManifest struct {
	Imports map[string]any `json:"imports"`
}

func (s *projectFileStores) buildDependencySignals() {
	s.DependenciesByDir = make(map[string]map[string]struct{}, len(s.DirnameToParent))
	s.ModuleTypeByDir = make(map[string]string, len(s.DirnameToParent))
	s.NodeVersionSignalByDir = make(map[string]string, len(s.DirnameToParent))

	for _, dir := range s.directoriesInParentOrder() {
		parent := s.DirnameToParent[dir]
		dependencies := cloneDependencySet(s.DependenciesByDir[parent])
		moduleType := s.ModuleTypeByDir[parent]
		nodeVersionSignal := s.NodeVersionSignalByDir[parent]

		if packageJSON, ok := s.PackageJSONs[dir]; ok {
			addPackageJSONDependencies(dependencies, packageJSON.Content)
			moduleType = detectPackageJSONModuleType(packageJSON.Content)
			if signal := detectPackageJSONNodeVersionSignal(packageJSON.Content); signal != "" {
				nodeVersionSignal = signal
			}
		}

		if denoManifest, ok := s.effectiveDenoManifest(dir); ok {
			addDenoDependencies(dependencies, denoManifest.Content)
			moduleType = moduleTypeModule
		}

		s.DependenciesByDir[dir] = dependencies
		if moduleType != "" {
			s.ModuleTypeByDir[dir] = moduleType
		}
		if nodeVersionSignal != "" {
			s.NodeVersionSignalByDir[dir] = nodeVersionSignal
		}
	}
}

func (s *projectFileStores) directoriesInParentOrder() []string {
	directories := make([]string, 0, len(s.DirnameToParent))
	for dir := range s.DirnameToParent {
		directories = append(directories, dir)
	}

	sort.SliceStable(directories, func(i int, j int) bool {
		leftDepth := strings.Count(tspath.NormalizePath(directories[i]), "/")
		rightDepth := strings.Count(tspath.NormalizePath(directories[j]), "/")
		if leftDepth != rightDepth {
			return leftDepth < rightDepth
		}
		return directories[i] < directories[j]
	})
	return directories
}

func (s *projectFileStores) effectiveDenoManifest(dir string) (dependencyManifest, bool) {
	if manifest, ok := s.DenoJSONs[dir]; ok {
		return manifest, true
	}
	manifest, ok := s.DenoJSONCs[dir]
	return manifest, ok
}

func (s *projectFileStores) activationSignalsForFile(filePath string) ruleActivationSignals {
	dir := tspath.GetDirectoryPath(filePath)
	for {
		if dependencies, ok := s.DependenciesByDir[dir]; ok {
			return ruleActivationSignals{
				Dependencies:       dependencies,
				DetectedModuleType: s.ModuleTypeByDir[dir],
			}
		}

		parent := tspath.GetDirectoryPath(dir)
		if parent == dir || parent == "" {
			return ruleActivationSignals{
				Dependencies:       map[string]struct{}{},
				DetectedModuleType: "",
			}
		}
		dir = parent
	}
}

func (s *projectFileStores) nodeVersionSignalForPath(filePath string) string {
	return s.nodeVersionSignalForDir(tspath.GetDirectoryPath(filePath))
}

func (s *projectFileStores) nodeVersionSignalForDir(dir string) string {
	dir = tspath.NormalizePath(dir)
	for dir != "" {
		if signal, ok := s.NodeVersionSignalByDir[dir]; ok {
			return signal
		}

		parent := tspath.GetDirectoryPath(dir)
		if parent == dir || parent == "" {
			break
		}
		dir = parent
	}

	return ""
}

func addPackageJSONDependencies(target map[string]struct{}, content string) {
	manifest := rawPackageJSONManifest{}
	if err := json.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return
	}

	addDependencyName(target, manifest.Name)
	addDependencyKeys(target, manifest.Dependencies)
	addDependencyKeys(target, manifest.DevDependencies)
	addDependencyKeys(target, manifest.PeerDependencies)
	addDependencyKeys(target, manifest.OptionalDependencies)
	addDependencyKeys(target, manifest.ModuleAliases)
}

func detectPackageJSONModuleType(content string) string {
	manifest := rawPackageJSONManifest{}
	if err := json.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return moduleTypeCommonJS
	}
	if manifest.Type == moduleTypeModule {
		return moduleTypeModule
	}
	return moduleTypeCommonJS
}

func detectPackageJSONNodeVersionSignal(content string) string {
	manifest := rawPackageJSONManifest{}
	if err := json.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return ""
	}

	for _, dependencies := range []map[string]any{
		manifest.Dependencies,
		manifest.DevDependencies,
		manifest.PeerDependencies,
		manifest.OptionalDependencies,
	} {
		if version := dependencyVersionSignal(dependencies, "@types/node"); version != "" {
			return version
		}
	}

	engineNode, ok := manifest.Engines["node"].(string)
	if !ok {
		return ""
	}
	if !isValidDependencySignal(engineNode) {
		return ""
	}
	return strings.TrimSpace(engineNode)
}

func addDenoDependencies(target map[string]struct{}, content string) {
	manifest := rawDenoManifest{}
	if err := json.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return
	}

	for _, rawTarget := range manifest.Imports {
		specifier, ok := rawTarget.(string)
		if !ok {
			continue
		}
		packageName, ok := parseDenoNpmImport(specifier)
		if !ok {
			continue
		}
		addDependencyName(target, packageName)
	}
}

func addDependencyKeys(target map[string]struct{}, dependencies map[string]any) {
	for name, value := range dependencies {
		switch value.(type) {
		case string, nil:
			addDependencyName(target, name)
		}
	}
}

func addDependencyName(target map[string]struct{}, dependency string) {
	trimmed := strings.TrimSpace(dependency)
	if trimmed == "" {
		return
	}
	if strings.HasPrefix(trimmed, definitelyTypedPref) {
		trimmed = strings.TrimPrefix(trimmed, definitelyTypedPref)
	}
	target[trimmed] = struct{}{}
}

func parseDenoNpmImport(specifier string) (string, bool) {
	if !strings.HasPrefix(specifier, "npm:") {
		return "", false
	}
	match := denoNpmImportPattern.FindStringSubmatch(strings.TrimPrefix(specifier, "npm:"))
	if len(match) < 2 || match[1] == "" {
		return "", false
	}
	return match[1], true
}

func dependencyVersionSignal(dependencies map[string]any, dependency string) string {
	if len(dependencies) == 0 {
		return ""
	}

	value, ok := dependencies[dependency].(string)
	if !ok || !isValidDependencySignal(value) {
		return ""
	}
	return strings.TrimSpace(value)
}

func isValidDependencySignal(versionSignal string) bool {
	trimmed := strings.TrimSpace(versionSignal)
	return trimmed != "" && trimmed != "*" && !strings.EqualFold(trimmed, "latest")
}

func cloneDependencySet(dependencies map[string]struct{}) map[string]struct{} {
	if len(dependencies) == 0 {
		return map[string]struct{}{}
	}

	cloned := make(map[string]struct{}, len(dependencies))
	for dependency := range dependencies {
		cloned[dependency] = struct{}{}
	}
	return cloned
}

func stripBOM(content string) string {
	return strings.TrimPrefix(content, "\ufeff")
}
