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
