import fs from "fs";

const RECORD_SIZE = 13;
export const RECORD_TYPE = {
    Debit: 0,
    Credit: 1,
    StartAutopay: 2,
    EndAutopay: 3,
};

const NODE_ENV = process.env.NODE_ENV;

export default class ParserMPS7 {
    constructor(path) {
        this.path = path;
        const buffer = fs.readFileSync(this.path);
        this.view = new DataView(buffer.buffer, 4);
    }

    isProtocolValid() {
        return this.getMagicString() === "MPS7";
    }

    getViewByteLength() {
        return this.view.byteLength;
    }

    isFloatOverflowed(v) {
        return String(v).lastIndexOf("e") !== -1;
    }

    getMagicString() {
        const fd = fs.openSync(this.path, "r");
        const b = Buffer.alloc(4);
        fs.readSync(fd, b, 0, 4, 0);
        fs.closeSync(fd);

        return b.toString("utf8"); // 4
    }

    /*
    - 0x00: Debit
    - 0x01: Credit
    - 0x02: StartAutopay
    - 0x03: EndAutopay
    */
    checkIsDebitOrCredit(type) {
        return type === RECORD_TYPE.Debit || type === RECORD_TYPE.Credit;
    }

    isValid(type, year, isDebitCredit, amountUSD) {
        const isAmountCorrect =
            !isDebitCredit || !this.isFloatOverflowed(amountUSD);

        return type <= 3 && year !== 1970 && isAmountCorrect;
    }

    // | 4 byte magic string "MPS7" | 1 byte version | 4 byte (uint32) # of records |
    parseHeader() {
        const name = this.getMagicString();
        const version = this.view.getUint8(0);
        const amount = this.view.getUint32(1);

        return { name, version, amount };
    }

    parseRecords() {
        let nextRecordPosition = this.findFirstRecord();
        let prevRecordPosition = 0;
        const records = [];

        while (nextRecordPosition < this.getViewByteLength() - RECORD_SIZE) {
            const { type, time, userId, amountUSD } =
                this.parseRecord(nextRecordPosition);
            const isDebitCredit = this.checkIsDebitOrCredit(type);
            let includeAmount = 0;

            const date = new Date(time * 1000);
            if (
                !this.isValid(
                    type,
                    date.getUTCFullYear(),
                    isDebitCredit,
                    amountUSD
                )
            ) {
                nextRecordPosition = nextRecordPosition + 1;
                continue;
            }

            if (NODE_ENV === "development") {
                console.log(
                    `offset : ${nextRecordPosition - 1} = ${
                        nextRecordPosition - prevRecordPosition
                    }`
                );
                console.log(`type: ${type}`);
                console.log(`timestamp: ${date}`);
                console.log(`user ID : ${userId}`);
                console.log(`amountInUSD : ${amountUSD}`);
                console.log(``);
            }

            includeAmount = isDebitCredit ? 8 : 0;

            prevRecordPosition = nextRecordPosition;

            nextRecordPosition =
                nextRecordPosition + RECORD_SIZE + includeAmount;

            records.push({
                type,
                date,
                userId,
                amountUSD,
            });
        }

        return records;
    }

    // | 1 byte record type enum | 4 byte (uint32) Unix timestamp | 8 byte (uint64) user ID | 8 byte (float64) amount in dollars |
    parseRecord(offset) {
        const type = this.view.getUint8(offset + 0); // 1 bytes
        const time = this.view.getUint32(offset + 1); // 4 bytes
        const userId = this.view.getBigUint64(offset + 5); // 8 bytes
        let amountUSD;
        let lastFieldOffset = 1 + 4 + 8 + 13;
        if (
            this.checkIsDebitOrCredit(type) &&
            this.view.byteLength > offset + lastFieldOffset
        ) {
            amountUSD = this.view.getFloat64(offset + 13);
        }
        return { type, time, userId, amountUSD };
    }

    findFirstRecord() {
        let offset = 0;
        while (offset < this.view.byteLength) {
            offset = offset + 1;
            const { type, time, amountUSD } = this.parseRecord(offset);
            const isDebitCredit = this.checkIsDebitOrCredit(type);
            const date = new Date(time * 1000);

            if (
                this.isValid(
                    type,
                    date.getUTCFullYear(),
                    isDebitCredit,
                    amountUSD
                )
            ) {
                break;
            }
        }

        return offset;
    }
}
