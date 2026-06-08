interface Thenable<T> {
  then<TResult>(onfulfilled?: (value: T) => TResult): Thenable<TResult>;
}

declare function executeCommand(): Thenable<void>;

void executeCommand();
void 0;
