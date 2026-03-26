import React from "react";

type Props = {
    name: string;
}

class Welcome extends React.Component<Props> {
    render () {
        return <div>Hello {this.props.name}</div>;
    }
}
