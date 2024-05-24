const workerClass = (typeof Worker === 'undefined' ? null : Worker);
const services = {'foo': 'bar'};

function _getServiceProvider (service) {
  const provider = services[service];
  return provider && {
    provider,
    isRemote: provider instanceof workerClass // Noncompliant: Right-hand side of 'instanceof' is not an object
  };
}

_getServiceProvider('foo');
