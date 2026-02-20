// Lazy initialization with module-scoped variable
function loadConfig(): Promise<Record<string, string>> {
  return Promise.resolve({ key: 'value' });
}

let configPromise: Promise<Record<string, string>>;

function getConfig(): Promise<Record<string, string>> {
  if (!configPromise) { // Compliant - lazy initialization
    configPromise = loadConfig();
  }
  return configPromise;
}

// Lazy initialization with class property
function fetchData(url: string): Promise<string> {
  return Promise.resolve('data from ' + url);
}

class DataService {
  private cachedResult!: Promise<string>;

  async getData(): Promise<string> {
    if (!this.cachedResult) { // Compliant - lazy initialization
      this.cachedResult = fetchData('/api/data');
    }
    return this.cachedResult;
  }
}

// Lazy initialization with nested member expression
class ApiClient {
  private cache: { data?: Promise<string[]> } = {};

  getItems(): Promise<string[]> {
    if (!this.cache.data) { // Compliant - lazy initialization
      this.cache.data = Promise.resolve(['a', 'b']);
    }
    return this.cache.data;
  }
}

// Promise in conditional without assignment in body
let pending: Promise<number>;

async function checkPending(): Promise<void> {
  pending = Promise.resolve(42);
  if (pending) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    console.log('always truthy');
  }
}

// Promise.resolve() directly in conditional
if (Promise.resolve(42)) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
  console.log('yolo');
}

// Lazy init with chained promise (e.g., fetch().then())
let _version: Promise<string>;
function getVersion(): Promise<string> {
  if (!_version) { // Compliant - lazy initialization with chained assignment
    _version = Promise.resolve('url')
      .then(r => r + '/path');
  }
  return _version;
}

// Function call returning Promise in conditional - should still raise
function isReady(): Promise<boolean> {
  return Promise.resolve(true);
}
async function checkReady(): Promise<void> {
  if (!isReady()) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    return;
  }
}

// Promise checked without assignment - guard clause is not lazy init
let guardPromise: Promise<void>;
function guardCheck(): void {
  guardPromise = Promise.resolve();
  if (guardPromise) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    return;
  }
}
