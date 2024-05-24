const workerClass = (typeof Worker === 'undefined' ? null : Worker);
const services = {'foo': 'bar'};

function _getServiceProvider (service) {
  const provider = services[service];
  return provider && {
    provider,
    isRemote: Boolean(workerClass && provider instanceof workerClass)
  };
}

_getServiceProvider('foo');