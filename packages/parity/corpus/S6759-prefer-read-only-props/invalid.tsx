interface Props {
  title: string;
}

function Card(props: Props) {
  return <div>{props.title}</div>;
}
