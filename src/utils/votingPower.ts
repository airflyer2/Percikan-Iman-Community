import { UserAccount, VotingPowerResult, VotingPowerPerson } from '../types';

export const CURRENT_ASSEMBLY_YEAR = 2026;
export const MINIMUM_VOTING_AGE = 16;

/**
 * Calculates voting power and provides a person-by-person breakdown for the General Assembly.
 * RULE: Exclusively active members can vote. Families get 1 vote for the primary member,
 * 1 vote for the spouse, and 1 vote for each child aged 16 or older.
 */
export function calculateVotingPower(user: UserAccount | null | undefined): VotingPowerResult {
  if (!user) {
    return {
      isMember: false,
      isEligibleToVote: false,
      ineligibilityReason: 'Voting in the General Assembly is exclusive to verified community members. Please sign in or register.',
      totalVotes: 0,
      category: 'personal',
      persons: [],
      summaryText: 'Not signed in (0 votes)'
    };
  }

  // Check formal membership standing
  const isExemptActive = Boolean(user.feeExemption?.isExempt);
  const isStatusActive = user.membershipStatus === 'active' || isExemptActive;

  if (!isStatusActive) {
    let reason = 'Membership is currently inactive.';
    if (user.membershipStatus === 'pending_payment') {
      reason = 'Annual membership contribution is pending settlement. Settle payment to activate General Assembly voting rights.';
    } else if (user.membershipStatus === 'relocated') {
      reason = 'Relocated members hold alumni status with active voting rights suspended per Art. 12 of the Verein Statuten.';
    } else if (user.membershipStatus === 'fee_paused') {
      reason = 'Membership contribution is temporarily paused. Active voting rights require current good standing.';
    }

    return {
      isMember: true,
      isEligibleToVote: false,
      ineligibilityReason: reason,
      totalVotes: 0,
      category: user.membershipCategory || 'personal',
      persons: [
        {
          name: user.name,
          relation: 'Primary Account Holder',
          isEligible: false,
          ineligibleReason: reason
        }
      ],
      summaryText: `Status: ${user.membershipStatus} (0 votes)`
    };
  }

  const category = user.membershipCategory === 'family' ? 'family' : 'personal';
  const persons: VotingPowerPerson[] = [];

  // 1. Primary Member (Always >= 16)
  persons.push({
    name: user.name,
    relation: 'Primary Member',
    age: 35, // standard adult
    isEligible: true
  });

  // 2. Personal Tier (also safe fallback for non-family categories)
  if (category !== 'family') {
    return {
      isMember: true,
      isEligibleToVote: true,
      totalVotes: 1,
      category: 'personal',
      persons,
      summaryText: '1 Personal Vote (Adult member >= 16 yrs)'
    };
  }

  // 3. Family Tier: 1 vote for primary, 1 for spouse, + 1 for each person >= 16
  let totalFamilyVotes = 1;

  // Evaluate Spouse
  const trimmedSpouseName = user.spouse?.name?.trim() || '';
  if (trimmedSpouseName !== '') {
    totalFamilyVotes += 1;
    persons.push({
      name: trimmedSpouseName,
      relation: 'Spouse / Co-head',
      age: 34,
      isEligible: true
    });
  }

  // Evaluate Children
  const children = user.children || [];
  let eligibleChildrenCount = 0;

  children.forEach((child) => {
    let age: number | undefined;

    if (child.birthYear) {
      const parsedYear = parseInt(child.birthYear, 10);
      if (!isNaN(parsedYear)) {
        age = Math.max(0, CURRENT_ASSEMBLY_YEAR - parsedYear);
      }
    }

    // Fallback: check if relation has explicit age indicator like "(14 yrs)", "(15 j)", "16 years", "16 tahun", or "age 16"
    // Must NOT match English ordinals like "16th grandchild" or "4th child".
    if (age === undefined && child.relation) {
      const match = child.relation.match(
        /(?:age\s*[:=]?\s*(\d+)|(\d+)\s*(?:yrs?|years?|jahre?|tahun|j\.?)(?=\s|[),.]|$))/i
      );
      if (match) {
        const parsedAge = parseInt(match[1] ?? match[2], 10);
        if (!isNaN(parsedAge)) {
          age = Math.max(0, parsedAge);
        }
      }
    }

    const isChildEligible = age !== undefined ? age >= MINIMUM_VOTING_AGE : false;

    if (isChildEligible) {
      totalFamilyVotes += 1;
      eligibleChildrenCount += 1;
      persons.push({
        name: child.name,
        relation: child.relation || 'Family Member',
        birthYear: child.birthYear,
        age,
        isEligible: true
      });
    } else {
      persons.push({
        name: child.name,
        relation: child.relation || 'Child',
        birthYear: child.birthYear,
        age,
        isEligible: false,
        ineligibleReason: age !== undefined
          ? `Age ${age} is under 16 (Minimum voting age per Art. 12 Verein Statuten)`
          : 'Under 16 years old'
      });
    }
  });

  const spousePart = trimmedSpouseName !== '' ? '1 Spouse' : null;
  const childPart = eligibleChildrenCount > 0
    ? `${eligibleChildrenCount} teen/adult ${eligibleChildrenCount === 1 ? 'member' : 'members'} (>= 16 yrs)`
    : null;

  const parts = ['1 Primary', spousePart, childPart].filter(Boolean).join(' + ');

  return {
    isMember: true,
    isEligibleToVote: true,
    totalVotes: totalFamilyVotes,
    category: 'family',
    persons,
    summaryText: `${totalFamilyVotes} Family Votes (${parts})`
  };
}
