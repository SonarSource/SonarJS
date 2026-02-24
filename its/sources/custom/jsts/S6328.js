const str = 'James Bond';

str.replace(/(\w+)\s(\w+)/, '$1, $0 $1'); // Noncompliant
str.replace(/(?<firstName>\w+)\s(?<lastName>\w+)/, '$<surname>, $<firstName> $<surname>'); // Noncompliant

str.replace(/(\w+)\s(\w+)/, '$2, $1 $2'); // Compliant
str.replace(/(?<firstName>\w+)\s(?<lastName>\w+)/, '$<lastName>, $<firstName> $<lastName>'); // Compliant
