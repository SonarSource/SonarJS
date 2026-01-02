function Component1() {
    function NestedComponent1() { // Noncompliant {{Move this component definition out of the parent component and pass data as props.}}
//           ^^^^^^^^^^^^^^^^
        return <div />;
    }
    return (
        <div>
            <NestedComponent1 />
        </div>
    );
}

function Component2() {
    class NestedComponent2 extends React.Component { // Noncompliant {{Move this component definition out of the parent component and pass data as props.}}
//        ^^^^^^^^^^^^^^^^
        render() {
            return <div />;
        }
    };

    return (
      <div>
        <NestedComponent2 />
      </div>
    );
}

// Compliant: react-intl FormattedMessage values prop
function Component3() {
    return (
        <FormattedMessage
            values={{
                b: chunks => <b>{chunks}</b>,
                link: chunks => <a href="#">{chunks}</a>,
                icon: () => <svg />,
            }}
        />
    );
}

// Compliant: react-intl useIntl().formatMessage
function Component4() {
    const intl = useIntl();
    return intl.formatMessage(
        { id: 'greeting' },
        {
            b: chunks => <b>{chunks}</b>,
            name: chunks => <strong>{chunks}</strong>,
        }
    );
}

// Compliant: other react-intl components
function Component5() {
    return (
        <FormattedPlural
            values={{
                em: chunks => <em>{chunks}</em>,
            }}
        />
    );
}

// Still noncompliant: non-react-intl component with values prop
function Component6() {
    return (
        <SomeOtherComponent
            values={{
                Item: () => <div />, // Noncompliant {{Move this component definition out of the parent component and pass data as props.}}
//                       ^^
            }}
        />
    );
}

// Still noncompliant: regular object with functions (not react-intl)
function Component7() {
    const renderers = {
        Bold: (chunks) => <b>{chunks}</b>, // Noncompliant {{Move this component definition out of the parent component and pass data as props.}}
//                     ^^
    };
    return <Something renderers={renderers} />;
}
