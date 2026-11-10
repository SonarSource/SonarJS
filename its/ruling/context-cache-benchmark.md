# Vuetify PR context benchmark

This opt-in integration test measures the Java sensor and the packaged Node bridge
using the Vuetify project pinned by `its/sources/projects`. It does not start
SonarQube, download/upload a scanner cache, or publish to the SQAA backend.
Backend/network overhead requires a separate scanner integration measurement.

The scope is Vuetify's JS, TS, JSX, TSX and Vue inputs, with declaration files,
hidden paths and node_modules excluded as analysis inputs. Declaration files and
other project files remain available for TypeScript resolution. As in the Java
ruling entry, no project dependency installation is performed by the test.
The quality profile is Sonar way plus S1116, which provides a deterministic issue
when the test appends an empty statement to an existing TypeScript file.

## Scenario

1. Copy the ruling fixture to an isolated output directory. Run a full master
   analysis, collecting context and writing the sensor cache to local files.
2. Edit `packages/vuetify/src/util/anchor.ts`, preserving its imports and exports.
3. Run the same PR with context disabled and enabled. Both read the exact same
   master cache generation; PR cache writes and copy operations are no-ops.
4. Discard one warm-up pair, then measure three pairs in alternating order.
5. Require every unchanged file to hit the cache, identical changed-file issues,
   no analysis errors, and a published context only in collection mode.
6. Make the source checkout unavailable and replay an edited file and a skipped
   file from the PR context. Compare their issues with the CI results.
7. Decode every PR archive with the Node implementation and verify that all
   indexed source contents match the PR, including every skipped file.

Each sensor run starts a fresh Node process. Sensor time includes bundle
extraction, Node startup, local cache reads, baseline restoration, rule execution,
context serialization and local attachment copies. Input indexing, fixture
creation, verification and bridge shutdown are outside the measured interval.
The sensor fixtures run in one JVM. Fixture objects from previous runs are
released and explicit GC runs before each measured interval. This is useful for
paired analyzer comparisons, not an end-to-end CI duration or memory prediction.

The Python wrapper samples RSS every 100 ms. It identifies the test JVM through a
phase marker, then samples that JVM and its Node descendants. The aggregate peak
is the maximum simultaneous Java + Node RSS, not the sum of separate maxima.
Maven, unrelated processes and the verifier are excluded. RSS includes shared
pages and sampling can miss short-lived peaks. Raw samples are retained.

Set `sonarjs.contextCacheFullComparisons=true` to add three full analyses of the
edited checkout and an all-cached PR. The all-cached PR uses the final full-analysis
cache generation, requires every file to hit the cache, emits no issues, and must
still publish a complete context. Full-analysis repetitions use fresh write caches.

The harness can run unchanged against the published baseline and the local prototype.
Build and package each implementation before running its measurements; use distinct
output directories and preserve the exact refs and package hashes. Do not replace
the packaged bridge while another benchmark is running.

## Run

Initialize the ruling fixture using the repository's usual submodule setup, or
set `sonarjs.contextCacheProject` to an existing Vuetify fixture. The test copies
the fixture and never edits the source corpus. Install SonarJS dependencies with
`npm ci` and build the bridge/Java artifacts normally before benchmarking.

Run this command from the repository root, substituting an absolute Node path:

```sh
python its/ruling/measure-context-cache.py -- mvn -B -pl its/ruling -am test \
  -P it-context-cache -Dtest=VuetifyContextCacheTest \
  -Dsurefire.failIfNoSpecifiedTests=false -Dsonarjs.contextCacheBenchmark=true \
  -Dsonarjs.localNodeExecutable=/absolute/path/to/node -Djacoco.skip=true \
  -Dsonarjs.contextCacheFullComparisons=true
node its/ruling/verify-context-cache.mjs
```

When artifacts have already been generated, `-Dskip-nodejs` avoids rebuilding
them during the Maven run. Do not use this flag with stale or absent artifacts.
On Windows quote the entire `-Dsonarjs.localNodeExecutable=...` argument when the
path contains spaces. PowerShell uses a backtick for continuation instead of `\`.

`sonarjs.contextCacheRepetitions` defaults to 3 and must be positive. Each new run
needs a fresh output directory. The default is `its/ruling/target/context-cache`;
for another directory, supply its absolute path to both the wrapper's `--output`
option and `-Dsonarjs.contextCacheOutput`. Pass the same directory to the verifier.

Outputs include sensor logs and attachments per phase, `measurements.json`,
`rss.csv`, `memory.json`, `completeness.json`, and Maven/Surefire reports. Retain
the corpus commit, SonarJS commit, runtime versions and machine information with
reported results. Set time/memory limits only after reviewing representative data.

## Self-contained context evaluation

The local prototype sends all current inputs during recording, separately flags
Java cache hits, and records fresh filesystem and program metadata. It preserves
rule skipping, but deliberately reads cached source contents and constructs programs
solely for context. This is an evaluation of that requirement change, not evidence
that the earlier no-extra-reads/programs requirement is met.

`measure-program-mapping.mjs` supplements Vuetify with two controlled 1,000-file
projects: ten independent tsconfigs, and an orphan-only project. Each compares a
one-file request without recording, a one-file rule analysis with all inputs mapped,
and full rule execution. One warm-up and three samples use fresh Node processes.
The timer covers request normalization, discovery, programs, rules and persistence;
it excludes module loading and process startup. Reported Node peak RSS includes
startup. These numbers are separate from the Java sensor benchmark.

```sh
node its/ruling/measure-program-mapping.mjs --run /absolute/fresh/output/directory
```

Regression tests separately cover import removal, added/deleted files, changed
compiler options, config precedence, project references, cache misses on SAME files,
all-cached requests, failure isolation and checkout-free replay. Broader orphan
roots can change type-aware findings compared to ordinary incremental requests.
Backend upload and real dependency-installation changes remain outside this
local benchmark. No time or memory budget has been accepted for this design.
