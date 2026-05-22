declare function save(value: string): void;
declare function cancel(value: string): void;

const inputConfig = {
  onFinish: (value: string, success: boolean) => {
    if (success) {
      save(value);
    } else {
      cancel(value);
    }
  },
};

void inputConfig;
