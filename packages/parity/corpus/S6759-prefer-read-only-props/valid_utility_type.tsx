interface BaseProps {
  readonly title: string;
  readonly body: string;
  readonly hidden: boolean;
}

type Props = Omit<BaseProps, 'hidden'>;

function ReadonlyCard(props: Props) {
  return (
    <div>
      {props.title}
      {props.body}
    </div>
  );
}
