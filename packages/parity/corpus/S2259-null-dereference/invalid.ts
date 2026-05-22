const direct: { prop: number } | undefined = undefined;
direct.prop;

const shortCircuit: { prop: number } | undefined = undefined;
if (shortCircuit == null && shortCircuit.prop === 1) {
}
