const guarded: { prop: number } | undefined = undefined;
if (guarded != null) {
  guarded.prop;
}

let updatedLater: { prop: number } | undefined = undefined;
function updateValue() {
  updatedLater = { prop: 1 };
}
updatedLater.prop;
