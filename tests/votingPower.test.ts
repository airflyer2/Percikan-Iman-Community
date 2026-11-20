import { describe, expect, it } from 'vitest';
import type { UserAccount } from '../src/types';
import { calculateVotingPower, CURRENT_ASSEMBLY_YEAR } from '../src/utils/votingPower';

function baseMember(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    uid: 'u-1',
    name: 'Primary Member',
    email: 'primary@percikaniman.org',
    membershipCategory: 'personal',
    membershipStatus: 'active',
    ...overrides
  };
}

describe('calculateVotingPower (adversarial boundaries)', () => {
  it('returns 0 non-eligible votes for null or undefined user', () => {
    expect(calculateVotingPower(null)).toMatchObject({
      isMember: false,
      isEligibleToVote: false,
      totalVotes: 0
    });
    expect(calculateVotingPower(undefined)).toMatchObject({
      isMember: false,
      isEligibleToVote: false,
      totalVotes: 0
    });
  });

  it('denies voting for pending_payment, relocated, fee_paused, and inactive unless feeExemption.isExempt is true', () => {
    for (const status of ['pending_payment', 'relocated', 'fee_paused', 'inactive'] as const) {
      const res = calculateVotingPower(baseMember({ membershipStatus: status }));
      expect(res.isMember).toBe(true);
      expect(res.isEligibleToVote).toBe(false);
      expect(res.totalVotes).toBe(0);
    }

    const exemptPending = calculateVotingPower(
      baseMember({
        membershipStatus: 'pending_payment',
        feeExemption: { isExempt: true, retainsBenefits: true }
      })
    );
    expect(exemptPending.isEligibleToVote).toBe(true);
    expect(exemptPending.totalVotes).toBe(1);
  });

  it('grants strictly 1 vote for personal tier even when spouse and adult children exist', () => {
    const res = calculateVotingPower(
      baseMember({
        membershipCategory: 'personal',
        spouse: { name: 'Spouse Name' },
        children: [{ id: 'c1', name: 'Adult Child', birthYear: '2000' }]
      })
    );
    expect(res.category).toBe('personal');
    expect(res.totalVotes).toBe(1);
    expect(res.persons).toHaveLength(1);
  });

  it('enforces exact age 16 boundary, clamps future birthYears, and ignores ordinals like 16th/4th', () => {
    const exact16Year = String(CURRENT_ASSEMBLY_YEAR - 16); // 2010
    const exact15Year = String(CURRENT_ASSEMBLY_YEAR - 15); // 2011
    const futureYear = String(CURRENT_ASSEMBLY_YEAR + 2); // 2028

    const res = calculateVotingPower(
      baseMember({
        membershipCategory: 'family',
        spouse: { name: '   ' }, // whitespace-only spouse must not count or leak into summaryText
        children: [
          { id: 'c1', name: 'Kid Ordinal 16th', relation: '16th grandchild' },
          { id: 'c2', name: 'Kid Ordinal 4th', relation: '4th child' },
          { id: 'c3', name: 'Exact 16', birthYear: exact16Year },
          { id: 'c4', name: 'Exact 15', birthYear: exact15Year },
          { id: 'c5', name: 'Future Child', birthYear: futureYear },
          { id: 'c6', name: 'Explicit Age 16 yrs', relation: 'Daughter (16 yrs)' },
          { id: 'c7', name: 'Explicit Age 15 j', relation: 'Son (15 j)' }
        ]
      })
    );

    expect(res.isEligibleToVote).toBe(true);
    // 1 Primary + 0 whitespace spouse + Exact 16 + Explicit Age 16 yrs = 3
    expect(res.totalVotes).toBe(3);
    expect(res.summaryText).not.toContain('Spouse');
    expect(res.summaryText).toBe('3 Family Votes (1 Primary + 2 teen/adult members (>= 16 yrs))');

    const byName = Object.fromEntries(res.persons.map((p) => [p.name, p]));
    expect(byName['Kid Ordinal 16th'].isEligible).toBe(false);
    expect(byName['Kid Ordinal 16th'].age).toBeUndefined();
    expect(byName['Kid Ordinal 4th'].isEligible).toBe(false);
    expect(byName['Kid Ordinal 4th'].age).toBeUndefined();
    expect(byName['Exact 16'].isEligible).toBe(true);
    expect(byName['Exact 16'].age).toBe(16);
    expect(byName['Exact 15'].isEligible).toBe(false);
    expect(byName['Exact 15'].age).toBe(15);
    expect(byName['Future Child'].isEligible).toBe(false);
    expect(byName['Future Child'].age).toBe(0);
    expect(byName['Future Child'].ineligibleReason).not.toContain('-');
    expect(byName['Explicit Age 16 yrs'].isEligible).toBe(true);
    expect(byName['Explicit Age 16 yrs'].age).toBe(16);
    expect(byName['Explicit Age 15 j'].isEligible).toBe(false);
    expect(byName['Explicit Age 15 j'].age).toBe(15);
  });

  it('does not inflate unknown membershipCategory into family tier', () => {
    const res = calculateVotingPower(
      baseMember({
        membershipCategory: 'alumni' as unknown as 'personal',
        spouse: { name: 'Spouse' },
        children: [{ id: 'c1', name: 'Adult', birthYear: '2000' }]
      })
    );
    expect(res.category).toBe('personal');
    expect(res.totalVotes).toBe(1);
  });
});
