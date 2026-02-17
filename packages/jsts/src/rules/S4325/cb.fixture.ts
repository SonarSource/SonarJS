// --- Compliant: generic function return type narrowed by assertion ---

interface ViewRef {
  destroy(): void;
}

interface EmbeddedViewRef<C> extends ViewRef {
  rootNodes: HTMLElement[];
  context: C;
}

class ViewContainerRef {
  private views: ViewRef[] = [];

  get<T extends ViewRef>(index: number): T | null {
    return (this.views[index] as T) ?? null;
  }
}

function measureRange(viewContainerRef: ViewContainerRef, start: number, end: number) {
  for (let i = 0; i < end - start; i++) {
    const view = viewContainerRef.get(i + start) as EmbeddedViewRef<unknown> | null; // Compliant
    if (view && view.rootNodes.length) {
      return view.rootNodes[0];
    }
  }
}

// --- Compliant: generic method return type narrowed to union type alias ---

interface StandardResult<Output> {
  value?: Output;
  issues?: { message: string }[];
}

interface StandardSchema {
  validate<T>(value: unknown): T;
}

type ValidationResult<TSchema> =
  | StandardResult<TSchema>
  | Promise<StandardResult<TSchema>>;

function createValidator<TSchema>(schema: StandardSchema, getValue: () => unknown) {
  return schema.validate(getValue()) as ValidationResult<TSchema>; // Compliant
}

// --- Compliant: non-null assertion on property declared as nullable ---

interface Api {
  user(): Promise<{ name: string }>;
  hasWriteAccess(): Promise<boolean>;
}

class CmsClient {
  api: Api | null = null;

  async authenticate(token: string) {
    if (token) {
      this.api = this.createApi(token);
    }
  }

  async getUser() {
    const user = await this.api!.user(); // Compliant
    const isCollab = await this.api!.hasWriteAccess(); // Compliant
    return { user, isCollab };
  }

  private createApi(_token: string): Api {
    return {
      user: async () => ({ name: 'test' }),
      hasWriteAccess: async () => true,
    };
  }
}

// --- Compliant: generic cache/store lookup narrowed by assertion ---

interface QueryData {
  fetchedAt: number;
}

interface UserProfile extends QueryData {
  name: string;
  email: string;
}

interface PaginatedList<T> extends QueryData {
  items: T[];
  total: number;
}

class QueryClient {
  private cache = new Map<string, unknown>();

  getQueryData<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }
}

function displayUserComments(client: QueryClient) {
  const user = client.getQueryData('user') as UserProfile | undefined; // Compliant
  const comments = client.getQueryData('comments') as PaginatedList<string> | undefined; // Compliant
  if (user && comments) {
    console.log(`${user.name} has ${comments.total} comments`);
  }
}

// --- Noncompliant: truly unnecessary assertion in narrowed context ---

function getName(x?: string | { name: string }) {
  if (x) {
    if (typeof x === 'string') {
      return (x as string); // Noncompliant {{This assertion is unnecessary since it does not change the type of the expression.}}
    }
  }
  return 'default';
}

// --- Noncompliant: unnecessary non-null assertion after truthiness check ---

function processValue(x?: number) {
  if (x !== undefined) {
    return x!; // Noncompliant {{This assertion is unnecessary since it does not change the type of the expression.}}
  }
  return 0;
}
