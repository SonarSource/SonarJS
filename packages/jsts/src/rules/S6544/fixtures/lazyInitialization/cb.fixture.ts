function fetchData(url: string): Promise<string> {
  return Promise.resolve('data from ' + url);
}

// Lazy initialization with class property (MemberExpression)
class DataService {
  private cachedResult!: Promise<string>;

  async getData(): Promise<string> {
    if (!this.cachedResult) { // Compliant
      this.cachedResult = fetchData('/api/data');
    }
    return this.cachedResult;
  }
}

// Lazy initialization with module-scoped variable (Identifier)
let configPromise: Promise<Record<string, string>>;

function getConfig(): Promise<Record<string, string>> {
  if (!configPromise) { // Compliant
    configPromise = Promise.resolve({ key: 'value' });
  }
  return configPromise;
}

// Lazy initialization without block braces
let singletonPromise: Promise<string>;

function getSingleton(): Promise<string> {
  if (!singletonPromise) // Compliant
    singletonPromise = fetchData('/api/singleton');
  return singletonPromise;
}

// Promise in conditional without assignment in body
let cachedPromise: Promise<string>;

function checkWithoutAssignment(): Promise<string> {
  if (!cachedPromise) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    console.log('not initialized');
  }
  cachedPromise = fetchData('/api');
  return cachedPromise;
}

// Promise variable in conditional without assignment
async function truePositive() {
  const p = new Promise<boolean>(resolve => resolve(true));
  if (p) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    console.log('always true');
  }
}

// Promise from function call in conditional
async function callInConditional() {
  if (fetchData('/api')) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    console.log('always true');
  }
}

// Lazy initialization with chained fetch().then() (from vuetify codepen.ts pattern)
let _version: Promise<string>;
function useVersion() {
  if (!_version) { // Compliant
    _version = fetch('https://example.com/', { method: 'HEAD' })
      .then(r => r.url);
  }
  return _version;
}

// Cache pattern where checked variable differs from assigned variable (from ant-design notification pattern)
const notificationCache: Record<string, Promise<object>> = {};
function getCachedInstance(key: string, callback: (inst: object) => void) {
  const cached = notificationCache[key];
  if (cached) { // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
    Promise.resolve(cached).then(inst => callback(inst));
    return;
  }
  notificationCache[key] = new Promise(resolve => {
    resolve({ key });
  });
}

// Guard clause checking Promise parameter (from angular.js interval/timeout pattern)
function cancelTask(promise?: Promise<unknown>): boolean {
  if (!promise) return false; // Noncompliant {{Expected non-Promise value in a boolean conditional.}}
  return true;
}
