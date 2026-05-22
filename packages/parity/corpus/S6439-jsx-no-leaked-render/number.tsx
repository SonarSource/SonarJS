const NumberComponent = (count: number, collection: string[]) => {
  return <div>{count && <List elements={collection} />}</div>;
};
