export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

const EPSILON = 0.01;

/**
 * Greedy min-cash-flow debt simplification (the standard approach used by
 * Splitwise-style apps). Not guaranteed minimal transaction count in general
 * (that variant is NP-hard) but always correct and fast at small group sizes.
 */
export function simplifyDebts(balances: Record<string, number>): Transfer[] {
  const working = Object.entries(balances)
    .map(([uid, balance]) => ({ uid, balance }))
    .filter((b) => Math.abs(b.balance) > EPSILON);

  const transfers: Transfer[] = [];

  while (working.length > 1) {
    working.sort((a, b) => a.balance - b.balance);
    const debtor = working[0];
    const creditor = working[working.length - 1];

    const amount = Math.min(creditor.balance, -debtor.balance);
    if (amount <= EPSILON) break;

    transfers.push({
      from: debtor.uid,
      to: creditor.uid,
      amount: Math.round(amount * 100) / 100,
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    for (let i = working.length - 1; i >= 0; i--) {
      if (Math.abs(working[i].balance) <= EPSILON) working.splice(i, 1);
    }
  }

  return transfers;
}

export interface MemberBalanceInput {
  uid: string;
  totalPaid: number;
  expectedPct: number;
}

/** balance = what they paid minus what they were expected to pay for this subset. */
export function computeBalances(members: MemberBalanceInput[], subsetTotal: number): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const m of members) {
    const expected = (m.expectedPct / 100) * subsetTotal;
    balances[m.uid] = m.totalPaid - expected;
  }
  return balances;
}
