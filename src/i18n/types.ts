export type SupportedLanguage = 'de' | 'ms' | 'id' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  isMain?: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    isMain: true
  },
  {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    flag: '🇲🇾'
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧'
  }
];

export interface TranslationDictionary {
  // Navigation & General
  nav: {
    home: string;
    programs: string;
    donate: string;
    about: string;
    contact: string;
    brandKit: string;
    member: string;
    myMembership: string;
    admin: string;
    adminMode: string;
    login: string;
    register: string;
    logout: string;
    familyTag: string;
    welcomeBack: string;
    portalBadge: string;
    returnToPublicSite: string;
    accessDenied: string;
    accessDeniedDesc: string;
  };
  // Home View
  home: {
    heroTag: string;
    heroTitle: string;
    heroSubtitle: string;
    explorePrograms: string;
    makeContribution: string;
    pillarsTitle: string;
    pillarsSubtitle: string;
    activeProgramsTitle: string;
    activeProgramsDesc: string;
    viewAllPrograms: string;
    transparentGivingTitle: string;
    transparentGivingDesc: string;
    supportCampaigns: string;
    communityMembersTitle: string;
    communityMembersDesc: string;
    joinPortal: string;
    featuredProgramsTitle: string;
    featuredProgramsSubtitle: string;
    viewAll6Programs: string;
  };
  // Programs View
  programs: {
    title: string;
    subtitle: string;
    allPrograms: string;
    religious: string;
    socialImpact: string;
    youth: string;
    health: string;
    transparency: string;
    community: string;
    searchPlaceholder: string;
    noProgramsFound: string;
    freeAdmission: string;
    memberBenefitTag: string;
    schedule: string;
    location: string;
    attendees: string;
    registerNow: string;
    viewDetails: string;
    askDirector: string;
    askDirectorSubtitle: string;
    registerModalTitle: string;
    registerModalSubtitle: string;
    fullName: string;
    emailAddress: string;
    phoneNumber: string;
    numParticipants: string;
    specialNotes: string;
    submitRegistration: string;
    submitting: string;
    registrationSuccess: string;
    registrationSuccessDetail: string;
    close: string;
    askQuestionTitle: string;
    questionTopic: string;
    yourQuestion: string;
    submitQuestion: string;
    questionSuccess: string;
  };
  // Donations & Transparency View
  donate: {
    title: string;
    subtitle: string;
    monthlyGoal: string;
    raisedSoFar: string;
    activeDonors: string;
    transparencyGuarantee: string;
    transparencyGuaranteeDesc: string;
    selectAmount: string;
    customAmount: string;
    oneTime: string;
    monthlyRecurring: string;
    destinationLabel: string;
    generalFund: string;
    foodAid: string;
    educationScholarships: string;
    healthClinicFund: string;
    paymentMethodLabel: string;
    bankTransfer: string;
    creditCard: string;
    paypal: string;
    taxDeductibleNotice: string;
    proceedDonation: string;
    directBankTitle: string;
    directBankSubtitle: string;
    bankName: string;
    accountHolder: string;
    iban: string;
    bic: string;
    reference: string;
    donationReceiptNotice: string;
    featuredCampaignsTitle: string;
    featuredCampaignsSubtitle: string;
    criticalNeed: string;
    target: string;
    supportCampaign: string;
    financialReportsTitle: string;
    financialReportsSubtitle: string;
    downloadAuditPdf: string;
    quarterlyAudit: string;
    fieldOperationsRatio: string;
    pledgeSubmittedBadge: string;
    pledgeSubmittedTitle: string;
    pledgeSubmittedDesc: string;
  };
  // About & Contact View
  about: {
    since1998: string;
    title: string;
    description: string;
    visionTitle: string;
    visionDesc: string;
    missionTitle: string;
    mission1: string;
    mission2: string;
    mission3: string;
    boardTitle: string;
    boardSubtitle: string;
    allDepartments: string;
    searchBoardPlaceholder: string;
    noBoardFound: string;
    adjustSearch: string;
    leadershipCouncil: string;
    swissLegalityTitle: string;
    swissLegalityDesc: string;
    viewStatutesBtn: string;
    swissSeatNotice: string;
  };
  contact: {
    title: string;
    subtitle: string;
    officeTitle: string;
    officeAddress: string;
    emailTitle: string;
    emailGeneral: string;
    emailDonors: string;
    callTitle: string;
    phoneNumbers: string;
    hours: string;
    visitingTitle: string;
    visitingDesc: string;
    formTitle: string;
    formSubtitle: string;
    yourName: string;
    yourEmail: string;
    subject: string;
    subjectGeneral: string;
    subjectPrograms: string;
    subjectDonation: string;
    subjectPartnership: string;
    subjectVolunteer: string;
    message: string;
    messagePlaceholder: string;
    submitMessage: string;
    messageSentTitle: string;
    messageSentDesc: string;
    sendAnother: string;
  };
  // Events Calendar
  events: {
    calendarTitle: string;
    calendarSubtitle: string;
    filterAll: string;
    filterMajelis: string;
    filterSocial: string;
    filterYouth: string;
    filterHealth: string;
    monthView: string;
    listView: string;
    noEventsDay: string;
    membersDiscount: string;
    freeForMembers: string;
    generalAdmission: string;
    registerForEvent: string;
    seatsRemaining: string;
    time: string;
    venue: string;
  };
  // Member Profile & Governance
  member: {
    portalTitle: string;
    portalSubtitle: string;
    digitalCardTitle: string;
    memberIdLabel: string;
    categoryLabel: string;
    personalCategory: string;
    familyCategory: string;
    statusLabel: string;
    activeStatus: string;
    relocatedStatus: string;
    pausedStatus: string;
    inactiveStatus: string;
    gaTermLabel: string;
    statutoryRuleTitle: string;
    statutoryRuleDesc: string;
    requestCategoryChange: string;
    categoryChangeTitle: string;
    categoryChangeSubtitle: string;
    currentCategory: string;
    selectNewCategory: string;
    categoryChangeReason: string;
    submitCategoryRequest: string;
    cancel: string;
    pendingAdminApproval: string;
    exemptionBadge: string;
    exemptionDesc: string;
    retainsBenefitsTag: string;
    yearlyFeeLabel: string;
    householdMembers: string;
    addFamilyMember: string;
    formalAuditLedger: string;
    formalAuditSubtitle: string;
    downloadCertificate: string;
    voteWeightVerifiedBadge: string;
    voteWeightPendingBadge: string;
    voteWeightPendingNotice: string;
  };
  // Admin & Governance Dashboard
  admin: {
    dashboardTitle: string;
    dashboardSubtitle: string;
    tabPrograms: string;
    tabEvents: string;
    tabContent: string;
    tabBoard: string;
    tabDonations: string;
    tabMembers: string;
    tabAttendance: string;
    tabAssembly: string;
    tabBootstrap: string;
    gaRuleTitle: string;
    gaRuleDesc: string;
    simulateGaRatification: string;
    voteFeeExemption: string;
    pendingCategoryRequests: string;
    approve: string;
    decline: string;
    allRegisteredMembers: string;
    searchMembersPlaceholder: string;
    pendingPledgesTitle: string;
    promotePledge: string;
    rejectPledge: string;
    pledgeStatusProcessing: string;
    pledgeStatusPromoted: string;
    pledgeStatusRejected: string;
    voterRollTitle: string;
    certifyVoterRoll: string;
    voteWeightVerified: string;
    voteWeightPending: string;
    voteWeightMismatch: string;
    reverifyVoteWeight: string;
    bootstrapTitle: string;
    bootstrapDesc: string;
    bootstrapRunAction: string;
    bootstrapAlreadySeeded: string;
  };
  // Footer & Common
  footer: {
    tagline: string;
    aboutText: string;
    quickLinks: string;
    legalSection: string;
    statutes: string;
    privacy: string;
    transparencyReport: string;
    imprint: string;
    registeredEvNotice: string;
    rightsReserved: string;
    language: string;
    mainLanguageLabel: string;
  };
}
