class CacheService {
  static request;
  static httpDeprecated = false;
}

function isRequest(data) {
  let orCondition =
      data &&
      typeof data === 'object' &&
      data.hasOwnProperty('status') &&
      data.hasOwnProperty('statusText') &&
      data.hasOwnProperty('headers') &&
      data.hasOwnProperty('url');
  if (CacheService.httpDeprecated) {
    orCondition =
        orCondition &&
        data.hasOwnProperty('type') &&
        data.hasOwnProperty('_body');
  } else {
    orCondition = orCondition && data.hasOwnProperty('body');
  }

  return data && (data instanceof CacheService.request || orCondition); // Noncompliant: Right-hand side of 'instanceof' is not an object
}

isRequest(1);
