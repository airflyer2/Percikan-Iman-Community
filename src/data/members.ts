import { UserAccount } from '../types';

export const DEFAULT_PERSONAL_MEMBER: UserAccount = {
  name: 'Bambang Sudirman',
  email: 'bambang.s@percikaniman.org',
  phone: '+49 176 8923 4410',
  address: {
    street: 'Kaiser-Friedrich-Str. 42',
    city: 'Frankfurt am Main',
    postalCode: '60329',
    country: 'Germany'
  },
  interest: 'Community Volunteer & Sunday Halaqah',
  memberCode: 'PI-7740',
  role: 'Active Member (Personal Tier)',
  isAdmin: false,
  joinedAt: 'Member since 2015',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'personal',
  membershipStatus: 'active',
  yearlyContribution: 80, // CHF 80 / year
  monthlyFee: 6.67,
  membershipYear: 2026,
  validUntil: '31 Dec 2026 (Subject to GA Renewal)',
  gaApprovalStatus: 'approved_current_year',
  lastGaResolutionRef: 'GA-2025/DEC-RES-09',
  children: [],
  // Example of pending category change request waiting for admin approval
  categoryChangeRequest: {
    requestedCategory: 'family',
    requestedAt: '10.09.2026',
    reason: 'Recently married and welcoming our newborn child, request upgrade to Family Tier for upcoming term.',
    status: 'pending'
  },
  feeExemption: {
    isExempt: false,
    retainsBenefits: true
  },
  formalStatusHistory: [
    {
      id: 'fst-1',
      status: 'active',
      effectiveDate: '01.01.2026',
      reason: 'Annual re-certification approved at 2025 General Assembly',
      recordedBy: 'General Assembly Resolution #GA-2025/09',
      dateLogged: '15.12.2025'
    }
  ]
};

export const DEFAULT_FAMILY_MEMBER: UserAccount = {
  name: 'Ridwan Kamil Santoso',
  email: 'ridwan.santoso@percikaniman.org',
  phone: '+49 152 4819 0332',
  address: {
    street: 'Leipziger Strasse 88, App. 3B',
    city: 'Berlin',
    postalCode: '10117',
    country: 'Germany'
  },
  interest: 'Family Islamic Education, Youth Mentorship & Ramadan Committee',
  memberCode: 'PI-FAM-2021',
  role: 'Family Tier Member',
  isAdmin: false,
  joinedAt: 'Member since 2019',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'family',
  membershipStatus: 'active',
  yearlyContribution: 120, // CHF 120 / year
  monthlyFee: 10,
  membershipYear: 2026,
  validUntil: '31 Dec 2026 (Subject to GA Renewal)',
  gaApprovalStatus: 'approved_current_year',
  lastGaResolutionRef: 'GA-2025/DEC-RES-14',
  spouse: {
    name: 'Siti Sarah Nurhaliza',
    email: 'siti.sarah@percikaniman.org',
    phone: '+49 152 4819 0335'
  },
  children: [
    {
      id: 'c1',
      name: 'Aisyah Az-Zahra Santoso',
      birthYear: '2012',
      relation: 'Daughter (14 yrs)',
      notes: 'Attends Sunday Quranic school & youth robotics'
    },
    {
      id: 'c2',
      name: 'Muhammad Rayhan Santoso',
      birthYear: '2015',
      relation: 'Son (11 yrs)',
      notes: 'Active in kids swimming & soccer club'
    },
    {
      id: 'c3',
      name: 'Maryam Khadijah Santoso',
      birthYear: '2020',
      relation: 'Daughter (6 yrs)',
      notes: 'Kindergarten group'
    }
  ],
  feeExemption: {
    isExempt: false,
    retainsBenefits: true
  },
  formalStatusHistory: [
    {
      id: 'fst-fam-1',
      status: 'active',
      effectiveDate: '01.01.2026',
      reason: 'General Assembly 2025 ratification for Membership Year 2026',
      recordedBy: 'Secretary General',
      dateLogged: '20.12.2025'
    }
  ]
};

export const DEFAULT_FEE_EXEMPT_MEMBER: UserAccount = {
  name: 'Ahmad Fauzi Rahman',
  email: 'ahmad.fauzi@percikaniman.org',
  phone: '+49 179 4321 8976',
  address: {
    street: 'Templergraben 55',
    city: 'Aachen',
    postalCode: '52062',
    country: 'Germany'
  },
  interest: 'Youth Mentorship, IT Infrastructure & Halaqah Assistant',
  memberCode: 'PI-STU-8821',
  role: 'Active Member (Fee Exempt - GA Voted)',
  isAdmin: false,
  joinedAt: 'Member since 2023',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'personal',
  membershipStatus: 'active',
  yearlyContribution: 0, // €0 / year voted by GA
  monthlyFee: 0,
  membershipYear: 2026,
  validUntil: '31 Dec 2026 (Subject to Annual GA Re-vote)',
  gaApprovalStatus: 'approved_current_year',
  lastGaResolutionRef: 'GA-2026/RES-VOTE-08',
  children: [],
  feeExemption: {
    isExempt: true,
    votedYear: 2026,
    approvedByGA: true,
    resolutionRef: 'GA-2026/RES-VOTE-08',
    exemptionReason: 'Full-time master student at RWTH Aachen & volunteer youth coordinator',
    validUntil: '31 Dec 2026',
    retainsBenefits: true // Fully retains subsidized event attending fees & voting rights
  },
  formalStatusHistory: [
    {
      id: 'fst-ex-1',
      status: 'active',
      effectiveDate: '01.01.2026',
      reason: 'Annual Fee Exemption approved by General Assembly Vote Resolution GA-2026/08. Retains full subsidized event and participation rights.',
      recordedBy: 'General Assembly Vote',
      dateLogged: '18.01.2026'
    }
  ]
};

export const DEFAULT_RELOCATED_MEMBER: UserAccount = {
  name: 'Indira Pratiwi Kusuma',
  email: 'indira.pratiwi@percikaniman.org',
  phone: '+62 811 2345 678',
  address: {
    street: 'Jl. Dago Asri No. 12',
    city: 'Bandung',
    postalCode: '40135',
    country: 'Indonesia'
  },
  interest: 'Alumni Network & International Zakat Liaison',
  memberCode: 'PI-ALUM-309',
  role: 'Relocated Alumni Member',
  isAdmin: false,
  joinedAt: 'Member since 2017',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'personal',
  membershipStatus: 'relocated',
  yearlyContribution: 0,
  monthlyFee: 0,
  membershipYear: 2026,
  statusReason: 'Formal relocation notice: returned to Indonesia after completion of contract.',
  statusChangeDate: '01.07.2026',
  children: [],
  formalStatusHistory: [
    {
      id: 'fst-reloc-1',
      status: 'relocated',
      effectiveDate: '01.07.2026',
      reason: 'Formal departure notification to Indonesia filed with Board. Yearly fee contribution suspended.',
      recordedBy: 'Board Secretariat Ref: REG-RELOC-2026-44',
      dateLogged: '25.06.2026'
    }
  ]
};

export const DEFAULT_ADMIN_USER: UserAccount = {
  name: 'Dr. H. Aam Amiruddin',
  email: 'admin@percikaniman.org',
  phone: '+49 69 7104 5500',
  address: {
    street: 'Percikan Iman Centrum, Mainzer Landstr. 112',
    city: 'Frankfurt am Main',
    postalCode: '60327',
    country: 'Germany'
  },
  interest: 'Board Leadership & Spiritual Guidance',
  memberCode: 'PI-ADMIN',
  role: 'Board Chairman & Super Administrator',
  isAdmin: true,
  isSuperAdmin: true,
  canManageBoard: true,
  canScanQR: true,
  joinedAt: 'Founding Member since 1998',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'family',
  membershipStatus: 'active',
  yearlyContribution: 120, // CHF 120 / year
  monthlyFee: 10,
  membershipYear: 2026,
  validUntil: '31 Dec 2026 (Subject to GA Renewal)',
  gaApprovalStatus: 'approved_current_year',
  lastGaResolutionRef: 'GA-FOUNDER-PERM',
  spouse: {
    name: 'Hj. Dra. Mulyaningsih',
    email: 'mulyaningsih@percikaniman.org',
    phone: '+49 69 7104 5501'
  },
  children: [
    {
      id: 'adm-c1',
      name: 'Farhan Amiruddin',
      birthYear: '2004',
      relation: 'Son',
      notes: 'University Student & Youth volunteer'
    },
    {
      id: 'adm-c2',
      name: 'Nadia Amiruddin',
      birthYear: '2008',
      relation: 'Daughter',
      notes: 'High school student'
    }
  ],
  feeExemption: {
    isExempt: false,
    retainsBenefits: true
  }
};

export const DEFAULT_SUPER_ADMIN_USER: UserAccount = {
  name: 'Super Administrator',
  email: 'superadmin@percikaniman.org',
  phone: '+49 69 7104 9999',
  address: {
    street: 'Percikan Iman Centrum, Mainzer Landstr. 112',
    city: 'Frankfurt am Main',
    postalCode: '60327',
    country: 'Germany'
  },
  interest: 'System Administration',
  memberCode: 'PI-SUPERADMIN',
  role: 'Super Administrator',
  isAdmin: true,
  isSuperAdmin: true,
  canManageBoard: true,
  canScanQR: true,
  joinedAt: 'System Member',
  avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'personal',
  membershipStatus: 'active',
  yearlyContribution: 0,
  monthlyFee: 0,
  membershipYear: 2026,
  validUntil: 'Permanent',
  feeExemption: {
    isExempt: true,
    retainsBenefits: true
  }
};

export const DEFAULT_PENDING_PAYMENT_MEMBER: UserAccount = {
  name: 'Taufik Hidayat',
  email: 'taufik.hidayat@percikaniman.org',
  phone: '+41 78 901 2345',
  address: {
    street: 'Bahnhofstrasse 14',
    city: 'Zürich',
    postalCode: '8001',
    country: 'Switzerland'
  },
  interest: 'Community Sports & Youth Halaqah',
  memberCode: 'PI-9552',
  role: 'Registered Member (Pending Fee)',
  isAdmin: false,
  joinedAt: 'Applied Sep 2026',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
  membershipCategory: 'personal',
  membershipStatus: 'pending_payment',
  paymentStatus: 'pending_payment',
  paymentMethod: 'cash',
  yearlyContribution: 80,
  monthlyFee: 6.67,
  membershipYear: 2026,
  validUntil: 'Pending Settlement',
  gaApprovalStatus: 'approved_current_year',
  children: [],
  feeExemption: {
    isExempt: false,
    retainsBenefits: true
  },
  formalStatusHistory: [
    {
      id: 'fst-pend-init',
      status: 'pending_payment',
      effectiveDate: '14.09.2026',
      reason: 'Online registration submitted with Cash settlement. Annual contribution (CHF 80) to be paid in cash to Board Administrator at monthly Pengajian gathering.',
      recordedBy: 'Self Registration Portal',
      dateLogged: '14.09.2026'
    }
  ]
};

export const INITIAL_MEMBERS_LIST: UserAccount[] = [
  DEFAULT_FAMILY_MEMBER,
  DEFAULT_PERSONAL_MEMBER,
  DEFAULT_PENDING_PAYMENT_MEMBER,
  DEFAULT_FEE_EXEMPT_MEMBER,
  DEFAULT_RELOCATED_MEMBER,
  DEFAULT_ADMIN_USER,
  DEFAULT_SUPER_ADMIN_USER
];

