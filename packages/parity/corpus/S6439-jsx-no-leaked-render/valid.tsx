const ValidComponent = (text: string, collection: string[]) => {
  return <div>{text.length > 0 && <List elements={collection} />}</div>;
};
