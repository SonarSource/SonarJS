function getPostPipeline(pipeline) {
  let pipelines = [1];
  const isString = typeof pipeline === 'string';

  const results = [];
  for (const instance of pipelines) {
  if ((isString && instance.name === pipeline) || !isString && instance instanceof pipeline) {
      results.push(instance);
    }
  }
  return (results.length === 1) ? results[0] : results;
}

getPostPipeline("1");