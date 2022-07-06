const Component = ({ count }) => {
  return <div>{count && <span>There are {count} results</span>}</div>
}
const Component2 = ({ nestedCollection }) => {
  return (
    <div>
      {nestedCollection.elements.length && <List elements={nestedCollection.elements} />}
    </div>
  )
}
