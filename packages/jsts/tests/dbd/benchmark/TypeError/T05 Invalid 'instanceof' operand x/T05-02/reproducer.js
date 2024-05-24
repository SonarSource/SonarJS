function getPostPipeline(pipeline) {
  let pipelines = [1];
  const isString = typeof pipeline === 'string';

  const results = [];
  for (const instance of pipelines) {
    if ((isString && instance.name === pipeline) || instance instanceof pipeline) {  // Noncompliant: Right-hand side of 'instanceof' is not an object
      results.push(instance);
    }
  }
  return (results.length === 1) ? results[0] : results;
}

getPostPipeline("1");
