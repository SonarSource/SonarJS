package main

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"

	"github.com/microsoft/typescript-go/shim/tspath"
	"gopkg.in/yaml.v3"
)

const (
	moduleTypeModule    = "module"
	moduleTypeCommonJS  = "commonjs"
	definitelyTypedPref = "@types/"

	manifestFieldName                 = "name"
	manifestFieldType                 = "type"
	manifestFieldDependencies         = "dependencies"
	manifestFieldDevDependencies      = "devDependencies"
	manifestFieldPeerDependencies     = "peerDependencies"
	manifestFieldOptionalDependencies = "optionalDependencies"
	manifestFieldModuleAliases        = "_moduleAliases"
	manifestFieldEngines              = "engines"
	manifestFieldCatalog              = "catalog"
	manifestFieldCatalogs             = "catalogs"
	manifestFieldWorkspaces           = "workspaces"
	manifestFieldPackages             = "packages"
)

var denoNpmImportPattern = regexp.MustCompile(`^(@[^/]+/[^/@]+|[^/@]+)(?:@([^/]+))?(?:/.*)?$`)

type ruleMetadata struct {
	DefaultOptionsJSON          string
	ConfigurationTransformsJSON string
	RequiredDependencies        []string
	RequiredModuleType          string
	RequiredEcmaVersion         int
}

type ruleActivationSignals struct {
	Dependencies        map[string]struct{}
	DetectedModuleType  string
	DetectedEcmaVersion int
}

type rawPackageJSONManifest map[string]any

type rawPnpmWorkspaceManifest map[string]any

type dependencyCatalogSource struct {
	catalog  map[string]string
	catalogs map[string]map[string]string
}

type resolvedPackageJSONManifest struct {
	Name                 string
	Type                 string
	Dependencies         map[string]string
	DevDependencies      map[string]string
	PeerDependencies     map[string]string
	OptionalDependencies map[string]string
	ModuleAliases        map[string]string
	Engines              map[string]string
}

type rawDenoManifest struct {
	Imports map[string]any `json:"imports"`
}

func (s *projectFileStores) buildDependencySignals() {
	s.DependenciesByDir = make(map[string]map[string]struct{}, len(s.DirnameToParent))
	s.ModuleTypeByDir = make(map[string]string, len(s.DirnameToParent))
	s.NodeVersionSignalByDir = make(map[string]string, len(s.DirnameToParent))

	packageJSONCache := map[string]rawPackageJSONManifest{}
	pnpmWorkspaceCache := map[string]rawPnpmWorkspaceManifest{}
	resolvedPackageJSONCache := map[string]*resolvedPackageJSONManifest{}

	for _, dir := range s.directoriesInParentOrder() {
		parent := s.DirnameToParent[dir]
		dependencies := cloneDependencySet(s.DependenciesByDir[parent])
		moduleType := s.ModuleTypeByDir[parent]
		nodeVersionSignal := s.NodeVersionSignalByDir[parent]

		if _, ok := s.PackageJSONs[dir]; ok {
			resolvedPackageJSON := s.resolvedPackageJSON(
				dir,
				packageJSONCache,
				pnpmWorkspaceCache,
				resolvedPackageJSONCache,
			)
			if resolvedPackageJSON != nil {
				addResolvedPackageJSONDependencies(dependencies, resolvedPackageJSON)
				moduleType = detectResolvedPackageJSONModuleType(resolvedPackageJSON)
				if signal := detectResolvedPackageJSONNodeVersionSignal(resolvedPackageJSON); signal != "" {
					nodeVersionSignal = signal
				}
			} else {
				moduleType = moduleTypeCommonJS
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

func (s *projectFileStores) resolvedPackageJSON(
	dir string,
	packageJSONCache map[string]rawPackageJSONManifest,
	pnpmWorkspaceCache map[string]rawPnpmWorkspaceManifest,
	resolvedCache map[string]*resolvedPackageJSONManifest,
) *resolvedPackageJSONManifest {
	if cached, ok := resolvedCache[dir]; ok {
		return cached
	}

	manifest := s.parsedPackageJSON(dir, packageJSONCache)
	if manifest == nil {
		resolvedCache[dir] = nil
		return nil
	}

	catalogSource := s.catalogSourceForPackageJSON(dir, packageJSONCache, pnpmWorkspaceCache)
	resolved := &resolvedPackageJSONManifest{
		Name:                 extractStringField(manifest, manifestFieldName),
		Type:                 extractStringField(manifest, manifestFieldType),
		Dependencies:         resolveDependencyField(manifest[manifestFieldDependencies], catalogSource),
		DevDependencies:      resolveDependencyField(manifest[manifestFieldDevDependencies], catalogSource),
		PeerDependencies:     resolveDependencyField(manifest[manifestFieldPeerDependencies], catalogSource),
		OptionalDependencies: resolveDependencyField(manifest[manifestFieldOptionalDependencies], catalogSource),
		ModuleAliases:        resolveDependencyField(manifest[manifestFieldModuleAliases], dependencyCatalogSource{}),
		Engines:              extractStringMap(manifest[manifestFieldEngines]),
	}

	resolvedCache[dir] = resolved
	return resolved
}

func (s *projectFileStores) catalogSourceForPackageJSON(
	dir string,
	packageJSONCache map[string]rawPackageJSONManifest,
	pnpmWorkspaceCache map[string]rawPnpmWorkspaceManifest,
) dependencyCatalogSource {
	if parentPackageJSON := s.findClosestParentPackageJSONWithCatalogs(dir, packageJSONCache); parentPackageJSON != nil {
		return catalogSourceFromPackageJSON(parentPackageJSON)
	}
	if pnpmWorkspace := s.findClosestPnpmWorkspace(dir, pnpmWorkspaceCache); pnpmWorkspace != nil {
		return catalogSourceFromPnpmWorkspace(pnpmWorkspace)
	}
	return dependencyCatalogSource{}
}

func (s *projectFileStores) findClosestParentPackageJSONWithCatalogs(
	dir string,
	packageJSONCache map[string]rawPackageJSONManifest,
) rawPackageJSONManifest {
	for current := s.parentDirectory(dir); current != ""; current = s.parentDirectory(current) {
		if manifest := s.parsedPackageJSON(current, packageJSONCache); manifest != nil && packageJSONHasCatalogs(manifest) {
			return manifest
		}
	}
	return nil
}

func (s *projectFileStores) findClosestPnpmWorkspace(
	dir string,
	pnpmWorkspaceCache map[string]rawPnpmWorkspaceManifest,
) rawPnpmWorkspaceManifest {
	for current := dir; current != ""; current = s.parentDirectory(current) {
		if manifest := s.parsedPnpmWorkspace(current, pnpmWorkspaceCache); manifest != nil {
			return manifest
		}
	}
	return nil
}

func (s *projectFileStores) parsedPackageJSON(
	dir string,
	cache map[string]rawPackageJSONManifest,
) rawPackageJSONManifest {
	if manifest, ok := cache[dir]; ok {
		return manifest
	}

	packageJSON, ok := s.PackageJSONs[dir]
	if !ok {
		cache[dir] = nil
		return nil
	}

	manifest := parseRawPackageJSONManifest(packageJSON.Content)
	cache[dir] = manifest
	return manifest
}

func (s *projectFileStores) parsedPnpmWorkspace(
	dir string,
	cache map[string]rawPnpmWorkspaceManifest,
) rawPnpmWorkspaceManifest {
	if manifest, ok := cache[dir]; ok {
		return manifest
	}

	workspace, ok := s.PnpmWorkspaceYAMLs[dir]
	if !ok {
		cache[dir] = nil
		return nil
	}

	manifest := parseRawPnpmWorkspaceManifest(workspace.Content)
	cache[dir] = manifest
	return manifest
}

func (s *projectFileStores) parentDirectory(dir string) string {
	if parent, ok := s.DirnameToParent[dir]; ok {
		return parent
	}

	parent := tspath.GetDirectoryPath(dir)
	if parent == dir {
		return ""
	}
	return parent
}

func addResolvedPackageJSONDependencies(
	target map[string]struct{},
	manifest *resolvedPackageJSONManifest,
) {
	if manifest == nil {
		return
	}

	addDependencyName(target, manifest.Name)
	addDependencyNames(target, manifest.Dependencies)
	addDependencyNames(target, manifest.DevDependencies)
	addDependencyNames(target, manifest.PeerDependencies)
	addDependencyNames(target, manifest.OptionalDependencies)
	addDependencyNames(target, manifest.ModuleAliases)
}

func detectResolvedPackageJSONModuleType(manifest *resolvedPackageJSONManifest) string {
	if manifest == nil {
		return moduleTypeCommonJS
	}
	if manifest.Type == moduleTypeModule {
		return moduleTypeModule
	}
	return moduleTypeCommonJS
}

func detectResolvedPackageJSONNodeVersionSignal(manifest *resolvedPackageJSONManifest) string {
	if manifest == nil {
		return ""
	}

	for _, dependencies := range []map[string]string{
		manifest.Dependencies,
		manifest.DevDependencies,
		manifest.PeerDependencies,
		manifest.OptionalDependencies,
	} {
		if version := dependencyVersionSignal(dependencies, "@types/node"); version != "" {
			return version
		}
	}

	engineNode, ok := manifest.Engines["node"]
	if !ok || !isValidDependencySignal(engineNode) {
		return ""
	}
	return strings.TrimSpace(engineNode)
}

func parseRawPackageJSONManifest(content string) rawPackageJSONManifest {
	manifest := rawPackageJSONManifest{}
	if err := json.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return nil
	}
	return manifest
}

func parseRawPnpmWorkspaceManifest(content string) rawPnpmWorkspaceManifest {
	manifest := rawPnpmWorkspaceManifest{}
	if err := yaml.Unmarshal([]byte(stripBOM(content)), &manifest); err != nil {
		return nil
	}
	if !hasMapKey(manifest, manifestFieldCatalog) &&
		!hasMapKey(manifest, manifestFieldCatalogs) &&
		!hasMapKey(manifest, manifestFieldPackages) {
		return nil
	}
	return manifest
}

func packageJSONHasCatalogs(manifest rawPackageJSONManifest) bool {
	if hasMapKey(manifest, manifestFieldCatalog) || hasMapKey(manifest, manifestFieldCatalogs) {
		return true
	}

	workspaces, ok := asStringAnyMap(manifest[manifestFieldWorkspaces])
	return ok && (hasMapKey(workspaces, manifestFieldCatalog) || hasMapKey(workspaces, manifestFieldCatalogs))
}

func catalogSourceFromPackageJSON(manifest rawPackageJSONManifest) dependencyCatalogSource {
	source := dependencyCatalogSource{}
	hasCatalog := false
	hasCatalogs := false

	if workspaces, ok := asStringAnyMap(manifest[manifestFieldWorkspaces]); ok {
		if rawCatalog, ok := workspaces[manifestFieldCatalog]; ok {
			source.catalog = extractStringMap(rawCatalog)
			hasCatalog = true
		}
		if rawCatalogs, ok := workspaces[manifestFieldCatalogs]; ok {
			source.catalogs = extractNestedStringMap(rawCatalogs)
			hasCatalogs = true
		}
	}

	if !hasCatalog {
		if rawCatalog, ok := manifest[manifestFieldCatalog]; ok {
			source.catalog = extractStringMap(rawCatalog)
		}
	}
	if !hasCatalogs {
		if rawCatalogs, ok := manifest[manifestFieldCatalogs]; ok {
			source.catalogs = extractNestedStringMap(rawCatalogs)
		}
	}

	return source
}

func catalogSourceFromPnpmWorkspace(manifest rawPnpmWorkspaceManifest) dependencyCatalogSource {
	return dependencyCatalogSource{
		catalog:  extractStringMap(manifest[manifestFieldCatalog]),
		catalogs: extractNestedStringMap(manifest[manifestFieldCatalogs]),
	}
}

func resolveDependencyField(raw any, catalogSource dependencyCatalogSource) map[string]string {
	dependencies, ok := asStringAnyMap(raw)
	if !ok {
		return nil
	}

	resolved := make(map[string]string, len(dependencies))
	for dependencyName, dependencyVersion := range dependencies {
		switch typedVersion := dependencyVersion.(type) {
		case string:
			if strings.HasPrefix(typedVersion, "catalog:") {
				resolved[dependencyName] = resolveCatalogReference(
					dependencyName,
					typedVersion,
					catalogSource,
				)
			} else {
				resolved[dependencyName] = typedVersion
			}
		case nil:
			resolved[dependencyName] = ""
		}
	}

	if len(resolved) == 0 {
		return nil
	}
	return resolved
}

func resolveCatalogReference(
	dependencyName string,
	dependencyVersion string,
	catalogSource dependencyCatalogSource,
) string {
	catalogName := strings.TrimSpace(strings.TrimPrefix(dependencyVersion, "catalog:"))
	if catalogName == "" {
		catalogName = "default"
	}

	if catalogName == "default" {
		if resolved, ok := catalogSource.catalog[dependencyName]; ok {
			return resolved
		}
		return dependencyVersion
	}

	if namedCatalog, ok := catalogSource.catalogs[catalogName]; ok {
		if resolved, ok := namedCatalog[dependencyName]; ok {
			return resolved
		}
	}
	return dependencyVersion
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

func addDependencyNames(target map[string]struct{}, dependencies map[string]string) {
	for name := range dependencies {
		addDependencyName(target, name)
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

func dependencyVersionSignal(dependencies map[string]string, dependency string) string {
	if len(dependencies) == 0 {
		return ""
	}

	value, ok := dependencies[dependency]
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

func hasMapKey(values map[string]any, key string) bool {
	if len(values) == 0 {
		return false
	}
	_, ok := values[key]
	return ok
}

func extractStringField(values map[string]any, key string) string {
	if len(values) == 0 {
		return ""
	}
	value, ok := values[key].(string)
	if !ok {
		return ""
	}
	return value
}

func extractStringMap(raw any) map[string]string {
	values, ok := asStringAnyMap(raw)
	if !ok {
		return nil
	}

	converted := make(map[string]string, len(values))
	for key, value := range values {
		stringValue, ok := value.(string)
		if ok {
			converted[key] = stringValue
		}
	}
	if len(converted) == 0 {
		return nil
	}
	return converted
}

func extractNestedStringMap(raw any) map[string]map[string]string {
	values, ok := asStringAnyMap(raw)
	if !ok {
		return nil
	}

	converted := make(map[string]map[string]string, len(values))
	for key, value := range values {
		stringMap := extractStringMap(value)
		if len(stringMap) > 0 {
			converted[key] = stringMap
		}
	}
	if len(converted) == 0 {
		return nil
	}
	return converted
}

func asStringAnyMap(raw any) (map[string]any, bool) {
	switch typed := raw.(type) {
	case rawPackageJSONManifest:
		return map[string]any(typed), true
	case rawPnpmWorkspaceManifest:
		return map[string]any(typed), true
	case map[string]any:
		return typed, true
	case map[interface{}]interface{}:
		converted := make(map[string]any, len(typed))
		for key, value := range typed {
			stringKey, ok := key.(string)
			if !ok {
				continue
			}
			converted[stringKey] = value
		}
		return converted, true
	default:
		return nil, false
	}
}

func stripBOM(content string) string {
	return strings.TrimPrefix(content, "\ufeff")
}
