import { RECORD_TYPE } from "./parser.js";
import Big from "big.js";

export default process = (records) => {
    let balanceByUser = {};
    let totalCredits = Big(0);
    let totalDebits = Big(0);
    let totalAutopayStarted = 0;
    let totalAutopayEnded = 0;

    records.forEach((record) => {
        if (!balanceByUser[record.userId]) {
            balanceByUser[record.userId] = Big(0);
        }

        if (record.type === RECORD_TYPE.Debit) {
            totalDebits = totalDebits.add(Big(record.amountUSD));

            balanceByUser[record.userId] = balanceByUser[record.userId].add(
                Big(record.amountUSD)
            );
        }
        if (record.type === RECORD_TYPE.Credit) {
            totalCredits = totalCredits.add(Big(record.amountUSD));

            balanceByUser[record.userId] = balanceByUser[record.userId].sub(
                Big(record.amountUSD)
            );
        }
        if (record.type === RECORD_TYPE.StartAutopay) {
            totalAutopayStarted += 1;
        }
        if (record.type === RECORD_TYPE.totalAutopayEnded) {
            totalAutopayEnded += 1;
        }
    });

    return {
        balanceByUser,
        totalCredits,
        totalDebits,
        totalAutopayStarted,
        totalAutopayEnded,
    };
};
