type CallBack = {
  cb: () => void
}

function setCallback(cb: CallBack) {

}

setCallback({cb: async () => {}}); // Compliant

type VoidCallback = () => void;
function makeCallback(): VoidCallback {
  return async () => { // Noncompliant {{Promise-returning function provided to return value where a void return was expected.}}
    await Promise.resolve();
  };
}

type ErrorHandler = {
  onError: (err: Error) => void;
  onSuccess: () => void;
};

async function cleanup(reason: string): Promise<void> {
  await Promise.resolve(reason);
}

const streamHandlers: ErrorHandler = {
  onError: async (err: Error) => { // Compliant
    await cleanup('error');
    console.error(err);
  },
  onSuccess: async () => { // Compliant
    await cleanup('done');
  },
};

type ListHandler = {
  doAtStart: (list: string[]) => void;
};

async function getItems(): Promise<string[]> {
  return Promise.resolve(['a', 'b']);
}

const readable: ListHandler = {
  async doAtStart(list: string[]) { // Compliant
    for (const item of await getItems()) {
      await Promise.resolve(item);
    }
  },
};

// Wrapper arrow function calling an async function assigned to void-typed property
async function navigate(url: string): Promise<void> {
  await Promise.resolve(url);
}

type PressHandler = {
  onPress: () => void;
};

const handler1: PressHandler = {
  onPress: () => navigate('/home'), // Compliant - wrapper calling async function for side effect
};

// Async method reference assigned to void-typed property
type BranchActions = {
  onDeleteBranch: (name: string) => void;
};

async function deleteBranch(branchName: string): Promise<void> {
  await Promise.resolve(branchName);
}

const branchActions: BranchActions = {
  onDeleteBranch: deleteBranch, // Compliant - async function reference in void-typed property
};

// Async function in object property with complex body (side-effects, no meaningful return)
type ConflictHandler = {
  onOpenConflictsDialog: () => void;
};

async function getConflictState(): Promise<string | null> {
  return Promise.resolve(null);
}

const conflictBanner: ConflictHandler = {
  onOpenConflictsDialog: async () => { // Compliant - async function performing side effects
    const state = await getConflictState();
    if (state == null) {
      return;
    }
    console.log(state);
  },
};
