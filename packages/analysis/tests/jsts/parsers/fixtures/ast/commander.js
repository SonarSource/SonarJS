const source = require('__sonar__').STRING_FROM_HTTP_REQUEST;
const sink = require('__sonar__').APPEND_ARGUMENT_TO_OS_COMMAND_STR;

require('commander').action(() => {
  sink(source()); // Noncompliant (S5883) - TP
});

const { program } = require('commander');
program.action(() => {
  sink(source()); // Noncompliant (S5883) - TP
});

const { Command } = require('commander');
new Command().action(() => {
  sink(source()); // Noncompliant (S5883) - TP
});

// Verify long commander method chains are serializable.
new Command()
  .command()
  .option()
  .version()
  .description()
  .configureHelp()
  .configureOutput()
  .addCommand()
  .addHelpCommand()
  .arguments()
  .exitOverride()
  .addOption()
  .requiredOption()
  .combineFlagAndOptionalValue()
  .allowUnknownOption()
  .allowExcessArguments()
  .enablePositionalOptions()
  .passThroughOptions()
  .storeOptionsAsProperties()
  .parse()
  .parseOptions()
  .opts()
  .missingArgument()
  .optionMissingArgument()
  .missingMandatoryOptionValue()
  .unknownOption()
  .unknownCommand()
  .alias()
  .aliases()
  .usage()
  .name()
  .helpOption()
  .help()
  .addHelpText()
  .createCommand()
  .action(() => {
    sink(source()); // Noncompliant (S5883) - TP
  });
