const registry = new Map<string, unknown>();

function getService<T>(name: string): T {
  return registry.get(name) as T;
}

const logger = getService('logger') as { log(message: string): void };
