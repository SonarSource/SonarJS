/** One provider registry for the single-project and complete ruling benchmarks. */
export const backends = Object.freeze({
  ts6: { label: 'classic', worker: 'classic', provider: 'ts6' },
  ts7: { label: 'native', worker: 'native', provider: 'ts7' },
  wasm: { label: 'wasm', worker: 'native', provider: 'wasm', bridge: 'syscall' },
  'wasm-direct': { label: 'wasm-direct', worker: 'native', provider: 'wasm', bridge: 'direct' },
});

export function backendOrder(selected, round) {
  const offset = round % selected.length;
  const order = [...selected.slice(offset), ...selected.slice(0, offset)];
  if (selected.length > 2 && Math.floor(round / selected.length) % 2) order.reverse();
  return order;
}

/** Rotate project positions independently of each project's backend positions. */
export function rulingOrder(projects, selected, round) {
  const offset = round % projects.length;
  return [...projects.slice(offset), ...projects.slice(0, offset)].flatMap(project =>
    backendOrder(selected, round + projects.indexOf(project)).map(backend => ({
      project,
      backend,
    })),
  );
}
