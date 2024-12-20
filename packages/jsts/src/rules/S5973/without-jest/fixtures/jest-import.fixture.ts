import jest from 'jest';

jest.retryTimes(3); // Noncompliant {{Make your tests stable so that they pass on the first try, or remove the flaky ones.}}
