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
