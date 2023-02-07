import agw from 'aws-cdk-lib/aws-apigateway';
import es from 'aws-cdk-lib/aws-elasticsearch';
import oss from 'aws-cdk-lib/aws-opensearchservice';

function f(unknownValue) {
  //wrong prop values
  new agw.CfnDomainName(this, 'Example', {
    securityPolicy: 'TLS_1_0' // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
    //              ^^^^^^^^^
  });

  new agw.DomainName(this, 'Example', {
    securityPolicy: agw.SecurityPolicy.TLS_1_0, // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
    //              ^^^^^^^^^^^^^^^^^^^^^^^^^^
  });

  new es.CfnDomain(this, 'Example', {
    domainEndpointOptions: {
      tlsSecurityPolicy: 'Policy-Min-TLS-1-0-2019-07', // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
      //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    },
  });

  new es.Domain(this, 'ExplicitlyNonCompliant', {
    tlsSecurityPolicy: es.TLSSecurityPolicy.TLS_1_0, // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
    //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  });

  new oss.CfnDomain(this, 'Example', {
    domainEndpointOptions: {
      tlsSecurityPolicy: 'Policy-Min-TLS-1-0-2019-07', // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
      //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    },
  });

  new oss.Domain(this, 'Example', {
    tlsSecurityPolicy: oss.TLSSecurityPolicy.TLS_1_0, // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
    //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  });

  const opts = {};
  //ignore spreads on arguments
  new agw.CfnDomainName(...opts);
  //doesn't match fqn
  new CfnDomainName(this, 'Example');

//missing props
  new agw.CfnDomainName(this, 'Example');  // NonCompliant {{Change this code to enforce TLS 1.2 or above.}}
  new agw.DomainName(this, 'Example');
  new es.CfnDomain(this, 'Example'); // NonCompliant {{Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.}}
  new es.Domain(this, 'ExplicitlyNonCompliant'); // NonCompliant {{Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.}}
  new oss.CfnDomain(this, 'Example'); // NonCompliant {{Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.}}
  new oss.Domain(this, 'Example'); // NonCompliant {{Omitting "tlsSecurityPolicy" enables a deprecated version of TLS. Set it to enforce TLS 1.2 or above.}}

  new agw.CfnDomainName(this, 'Example', undefined);  // NonCompliant
  new agw.DomainName(this, 'Example', undefined);
  new es.CfnDomain(this, 'Example', undefined); // NonCompliant
  new es.Domain(this, 'ExplicitlyNonCompliant', undefined); // NonCompliant
  new oss.CfnDomain(this, 'Example', undefined); // NonCompliant
  new oss.Domain(this, 'Example', undefined); // NonCompliant

  new agw.CfnDomainName(this, 'Example', {securityPolicy: undefined}); // NonCompliant
  new agw.DomainName(this, 'Example', {securityPolicy: undefined});
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: undefined}}); // NonCompliant
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: {}}); // NonCompliant
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: undefined}); // NonCompliant
  new es.Domain(this, 'ExplicitlyNonCompliant', {tlsSecurityPolicy: undefined}); // NonCompliant
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: undefined}}); // NonCompliant
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: {}}); // NonCompliant
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: undefined}); // NonCompliant
  new oss.Domain(this, 'Example', {tlsSecurityPolicy: undefined}); // NonCompliant

  new agw.CfnDomainName(this, 'Example', opts); // NonCompliant
  new agw.DomainName(this, 'Example', opts);
  new es.CfnDomain(this, 'Example', opts); // NonCompliant
  new es.Domain(this, 'ExplicitlyNonCompliant', opts); // NonCompliant
  new oss.CfnDomain(this, 'Example', opts); // NonCompliant
  new oss.Domain(this, 'Example', opts); // NonCompliant

//unknown props
  new agw.CfnDomainName(this, 'Example', unknownValue);
  new agw.DomainName(this, 'Example', unknownValue);
  new es.CfnDomain(this, 'Example', unknownValue);
  new es.Domain(this, 'ExplicitlyNonCompliant', unknownValue);
  new oss.CfnDomain(this, 'Example', unknownValue);
  new oss.Domain(this, 'Example', unknownValue);

  new agw.CfnDomainName(this, 'Example', {...unknownValue});
  new agw.DomainName(this, 'Example', {...unknownValue});
  new es.CfnDomain(this, 'Example', {...unknownValue});
  new es.Domain(this, 'ExplicitlyNonCompliant', {...unknownValue});
  new oss.CfnDomain(this, 'Example', {...unknownValue});
  new oss.Domain(this, 'Example', {...unknownValue});

  new agw.CfnDomainName(this, 'Example', {securityPolicy: unknownValue});
  new agw.DomainName(this, 'Example', {securityPolicy: unknownValue});
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: unknownValue}});
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: unknownValue});
  new es.Domain(this, 'ExplicitlyNonCompliant', {tlsSecurityPolicy: unknownValue});
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: unknownValue}});
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: unknownValue});
  new oss.Domain(this, 'Example', {tlsSecurityPolicy: unknownValue});


  new agw.CfnDomainName(this, 'Example', {securityPolicy: 'TLS_1_2'});
  new agw.DomainName(this, 'Example', {securityPolicy: agw.SecurityPolicy.TLS_1_2});
  new es.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07'}});
  new es.Domain(this, 'ExplicitlyNonCompliant', {tlsSecurityPolicy: es.TLSSecurityPolicy.TLS_1_2});
  new oss.CfnDomain(this, 'Example', {domainEndpointOptions: {tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07'}});
  new oss.Domain(this, 'Example', {tlsSecurityPolicy: oss.TLSSecurityPolicy.TLS_1_2});
}
