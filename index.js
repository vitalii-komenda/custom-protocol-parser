import ParserMPS7 from "./parser.js";
import chalk from 'chalk';
const log = console.log;
const BINARY_FILE_PATH = "./proto/txnlog.dat";
const parserMPS7 = new ParserMPS7(BINARY_FILE_PATH);

function run() {
    const { name, version, amount } = parserMPS7.parseHeader();
    // Log the parsed data
    log(chalk.blue.bold(`Header`));
    log(chalk.blue(`name: ${name}`));
    log(chalk.blue(`version: ${version}`));
    log(chalk.blue(`amount: ${amount}`));
    log(`---------`);
    log('')

    let nextRecordPosition = parserMPS7.findFirstRecord();
    let prevRecordPosition = 0;
    const RECORD_SIZE = 13;

    while (nextRecordPosition < parserMPS7.getViewByteLength() - RECORD_SIZE) {
        const { type, time, userId, amountUSD } = parserMPS7.parseRecord(
            nextRecordPosition
        );
        const isDebitCredit = parserMPS7.checkIsDebitOrCredit(type);
        let includeAmount = 0;

        const date = new Date(time * 1000);
        if (!parserMPS7.isValid(type, date.getUTCFullYear(), isDebitCredit, amountUSD)) {
            nextRecordPosition = nextRecordPosition + 1;
            continue;
        }

        console.log(
            `offset : ${nextRecordPosition - 1} = ${nextRecordPosition - prevRecordPosition
            }`
        );
        console.log(`type: ${type}`);
        console.log(`timestamp: ${date}`);
        console.log(`user ID : ${userId}`);
        console.log(`amountInUSD : ${amountUSD}`);

        includeAmount = isDebitCredit ? 8 : 0;

        console.log(``);
        prevRecordPosition = nextRecordPosition;
        // nextRecordPosition = nextRecordPosition + 1;

        nextRecordPosition = nextRecordPosition + RECORD_SIZE + includeAmount;
    }

}

if (parserMPS7.isProtocolValid()) {
    run();
} else {
    log(chalk.red(`Unsupported protocol detected (Incorrect magic string): ${parserMPS7.getMagicString()}`));
}
