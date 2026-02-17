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

// --- Noncompliant: assertion to `any` on an already-`any` expression is unnecessary ---

function processChunk(chunk: any) {
  let mutator = (chunk as any); // Noncompliant [[qf3!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf3 {{  let mutator = (chunk);}}
}

// --- Compliant: generic function with no explicit return type annotation ---

function createItem<T>(factory: { create(): T }): T {
  return factory.create();
}

interface SpecificItem {
  id: number;
}

function useItem(factory: { create(): unknown }) {
  const item = createItem(factory) as SpecificItem; // Compliant
}

// --- Compliant: non-null assertion on variable declared as | undefined (no strictNullChecks) ---

function processResult<T>(callback: () => T | undefined) {
  let result: T | undefined;
  result = callback();
  return result!; // Compliant
}

// --- Noncompliant: assertion to `any` using angle-bracket syntax ---

function processData(data: any) {
  const val = <any>data; // Noncompliant [[qf4!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf4 {{  const val = data;}}
}

// --- Noncompliant: truly unnecessary assertion in narrowed context ---

function getName(x?: string | { name: string }) {
  if (x) {
    if (typeof x === 'string') {
      return (x as string); // Noncompliant [[qf1!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf1 {{      return (x);}}
    }
  }
  return 'default';
}

// --- Noncompliant: unnecessary non-null assertion after truthiness check ---

function processValue(x?: number) {
  if (x !== undefined) {
    return x!; // Noncompliant [[qf2!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf2 {{    return x;}}
  }
  return 0;
}

// --- Noncompliant: generic with type param inferrable from arguments ---

function filterItems<T>(array: T[], predicate: (item: T) => boolean): T[] {
  return array.filter(predicate);
}

function getFilteredColumns(columns: string[]) {
  const filtered = filterItems(columns, c => c.length > 0) as string[]; // Noncompliant [[qf5!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf5 {{  const filtered = filterItems(columns, c => c.length > 0);}}
}

// --- Noncompliant: generic with no explicit return type but concrete inferred return ---

function toStringValue<T>(value: T) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function formatValue(input: number) {
  const s = toStringValue(input) as string; // Noncompliant [[qf6!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf6 {{  const s = toStringValue(input);}}
}

// --- Noncompliant: generic return with LHS type annotation makes assertion redundant ---

class DataStore {
  getData<T>(key: string): T | undefined {
    return undefined;
  }
}

function fetchUserData(store: DataStore) {
  const user: UserProfile | undefined = store.getData('user') as UserProfile | undefined; // Noncompliant [[qf7!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf7 {{  const user: UserProfile | undefined = store.getData('user');}}
}

// --- Noncompliant: generic return in function with explicit return type ---

function lookupUser(store: DataStore): UserProfile | undefined {
  return store.getData('user') as UserProfile | undefined; // Noncompliant [[qf8!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf8 {{  return store.getData('user');}}
}

// --- Noncompliant: generic return used as function argument ---

function processUser(user: UserProfile | undefined) {
  return user;
}

function processStoredUser(store: DataStore) {
  return processUser(store.getData('user') as UserProfile | undefined); // Noncompliant [[qf9!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf9 {{  return processUser(store.getData('user'));}}
}

// --- Noncompliant: generic return assigned to typed property ---

class UserService {
  user: UserProfile | undefined;

  loadUser(store: DataStore) {
    this.user = store.getData('user') as UserProfile | undefined; // Noncompliant [[qf10!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf10 {{    this.user = store.getData('user');}}
  }
}

// --- Noncompliant: generic clone with type param in parameter ---

function cloneNode<T extends ViewRef>(node: T): T {
  return { ...node };
}

function processView(view: EmbeddedViewRef<string>) {
  const copy = cloneNode(view) as EmbeddedViewRef<string>; // Noncompliant [[qf11!]] {{This assertion is unnecessary since it does not change the type of the expression.}}
// edit@qf11 {{  const copy = cloneNode(view);}}
}

// --- Compliant: generic return with no contextual type (assertion is sole type source) ---

function createWidget<T>(config: string): T {
  return {} as T;
}

function useWidget() {
  const widget = createWidget('button') as HTMLButtonElement; // Compliant
}

// --- Compliant: angle-bracket syntax narrowing generic querySelector return ---

function setupGhost(ghost: HTMLElement) {
  const eIcon = <HTMLElement>ghost.querySelector('.ghost-icon'); // Compliant
  const eLabel = <HTMLElement>ghost.querySelector('.ghost-label'); // Compliant
  if (eIcon && eLabel) {
    eLabel.innerHTML = 'dragging';
  }
}

// --- Compliant: generic return in return statement without function return type ---

function newComponent<A extends ViewRef>(config: string): A {
  return {} as A;
}

function createEmptyComponent() {
  return <EmbeddedViewRef<unknown>>newComponent('empty'); // Compliant
}
