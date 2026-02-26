type CallBack = {
  cb: () => void
}

function setCallback(cb: CallBack) {

}

setCallback({cb: async () => {}}); // Compliant

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
