import ParserMPS7 from "./parser.js";
import chalk from "chalk";
import Processor from "./processor.js";
const log = console.log;
const BINARY_FILE_PATH = "./proto/txnlog.dat";
const parserMPS7 = new ParserMPS7(BINARY_FILE_PATH);

function run() {
    const { name, version, amount } = parserMPS7.parseHeader();

    log(chalk.blue.bold(`Header`));
    log(chalk.blue(`name: ${name}`));
    log(chalk.blue(`version: ${version}`));
    log(chalk.blue(`amount: ${amount}`));
    log(`---------`);
    log("");

    const records = parserMPS7.parseRecords();
    const res = process(records);

    log(chalk.green.bold(`Results`));
    log(chalk.green(`total credit amount: ${res.totalCredits}`));
    log(chalk.green(`total debit amount: ${res.totalDebits}`));
    log(chalk.green(`autopays started: ${res.totalAutopayStarted}`));
    log(chalk.green(`autopays ended: ${res.totalAutopayEnded}`));
    log(chalk.green(`balance for user 2456938384156277127: ${res.balanceByUser['2456938384156277127']}`));
}

if (parserMPS7.isProtocolValid()) {
    run();
} else {
    log(
        chalk.red(
            `Unsupported protocol detected (Incorrect magic string): ${parserMPS7.getMagicString()}`
        )
    );
}
