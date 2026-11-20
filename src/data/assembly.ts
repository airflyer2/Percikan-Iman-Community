import { AssemblyQuestion, BoardInquiry, GASessionState } from '../types';

export const INITIAL_GA_SESSION_STATE: GASessionState = {
  isOpen: true, // Opened on the date of the General Assembly
  sessionTitle: 'Ordentliche Generalversammlung 2026 (Mitgliederversammlung)',
  scheduledDate: '15. September 2026',
  activeQuestionId: 'ga-q1', // First motion is currently on the floor for parliamentary voting
  openedAt: '2026-09-15T09:00:00Z',
  openedBy: 'Super Administrator & Vorstand',
  location: 'Zürich & Online Hybrid Chamber'
};

export const INITIAL_ASSEMBLY_QUESTIONS: AssemblyQuestion[] = [
  {
    id: 'ga-q1',
    agendaOrder: 1,
    title: 'Motion #1: Ratification of Financial Statement 2025 & Operational Budget 2026 (CHF 145,000)',
    description:
      'The Board of Directors submits the audited annual financial report for the fiscal year 2025 (surplus CHF 14,280) alongside the proposed operational budget of CHF 145,000 for fiscal year 2026. This budget allocates funds for community halaqah venues, monthly guest ustadz travel, youth mentorship, and emergency solidarity funds.',
    category: 'Budget & Financial',
    status: 'on_floor', // Currently raised on the floor for voting
    type: 'yes_no_abstain',
    quorumRequiredPercent: 50,
    statuteArticleRef: 'Art. 12 Abs. 2 Verein Statuten (Ordentliche Beschlüsse)',
    createdBy: 'Dr. H. Aam Amiruddin (Board Chairman)',
    createdAt: '2026-09-01T10:00:00Z',
    totalVotesWeighted: 32,
    totalBallots: 11,
    options: [
      {
        id: 'opt-yes',
        text: 'Ja / Setuju / Approve (In Favor)',
        votesWeighted: 28,
        ballotCount: 9
      },
      {
        id: 'opt-no',
        text: 'Nein / Menolak / Reject (Against)',
        votesWeighted: 2,
        ballotCount: 1
      },
      {
        id: 'opt-abstain',
        text: 'Enthaltung / Abstain',
        votesWeighted: 2,
        ballotCount: 1
      }
    ]
  },
  {
    id: 'ga-q2',
    agendaOrder: 2,
    title: 'Motion #2: Statute Amendment (Art. 12): Digital Attendance & Hybrid Voting Authorization',
    description:
      'Formal amendment to Article 12 of the Verein "Percikan Iman" Statuten. The revision explicitly permits members across Switzerland and Europe who cannot physically attend the General Assembly in Zürich to register digital attendance and cast weighted digital ballots during the official voting window via the authenticated community portal.',
    category: 'Statute Amendment',
    status: 'draft', // Prepared in advance by Admin; will be opened on floor after Motion #1
    type: 'yes_no_abstain',
    quorumRequiredPercent: 66.7, // 2/3 qualified majority per Art. 79 ZGB
    statuteArticleRef: 'Art. 16 Statuten & Art. 79 ZGB (Statutenänderung / 2/3 Mehrheit)',
    createdBy: 'General Assembly Secretariat',
    createdAt: '2026-09-03T11:30:00Z',
    totalVotesWeighted: 0,
    totalBallots: 0,
    options: [
      {
        id: 'opt-yes',
        text: 'Ja / Setuju / Approve (In Favor)',
        votesWeighted: 0,
        ballotCount: 0
      },
      {
        id: 'opt-no',
        text: 'Nein / Menolak / Reject (Against)',
        votesWeighted: 0,
        ballotCount: 0
      },
      {
        id: 'opt-abstain',
        text: 'Enthaltung / Abstain',
        votesWeighted: 0,
        ballotCount: 0
      }
    ]
  },
  {
    id: 'ga-q3',
    agendaOrder: 3,
    title: 'Motion #3: Swiss Youth Leadership & Mentorship Camp 2026 Subsidy Allocation',
    description:
      'Determination of community co-sponsorship for the upcoming 4-day Youth Mentorship Camp in Berner Oberland for teenagers and young adults aged 16–25. Total project budget is CHF 24,000. Members vote on the level of subsidy from general reserves.',
    category: 'Community Project',
    status: 'draft', // Prepared in advance by Admin
    type: 'multiple_choice',
    quorumRequiredPercent: 50,
    statuteArticleRef: 'Art. 2 Abs. 3 Statuten (Jugendförderung & Bildung)',
    createdBy: 'Youth & Tarbiyah Department',
    createdAt: '2026-09-05T09:15:00Z',
    totalVotesWeighted: 0,
    totalBallots: 0,
    options: [
      {
        id: 'opt-a',
        text: 'Option A: Full Subsidy (CHF 18,000 from reserves — free for youth members)',
        votesWeighted: 0,
        ballotCount: 0
      },
      {
        id: 'opt-b',
        text: 'Option B: Partial Subsidy (CHF 10,000 from reserves + CHF 50 participant fee)',
        votesWeighted: 0,
        ballotCount: 0
      },
      {
        id: 'opt-c',
        text: 'Option C: Postpone Project to Next Fiscal Year',
        votesWeighted: 0,
        ballotCount: 0
      }
    ]
  },
  {
    id: 'ga-q4',
    agendaOrder: 4,
    title: 'Motion #4: Ratification of Annual Membership Fee Schedule 2026 (Personal CHF 80, Family CHF 120)',
    description:
      'The formal yearly confirmation of membership dues pursuant to Art. 7 of the Statuten. Maintained unchanged from previous year: Personal membership CHF 80/year, Family membership CHF 120/year, with annual hardship and student fee-exemptions ratified individually by the assembly.',
    category: 'Budget & Financial',
    status: 'closed',
    type: 'yes_no_abstain',
    quorumRequiredPercent: 50,
    statuteArticleRef: 'Art. 7 Statuten (Mitgliederbeiträge)',
    createdBy: 'Treasurer & Financial Board',
    createdAt: '2026-08-15T08:00:00Z',
    closedAt: '2026-08-30T23:59:59Z',
    totalVotesWeighted: 52,
    totalBallots: 18,
    options: [
      {
        id: 'opt-yes',
        text: 'Ja / Setuju / Approve (In Favor)',
        votesWeighted: 49,
        ballotCount: 17
      },
      {
        id: 'opt-no',
        text: 'Nein / Menolak / Reject (Against)',
        votesWeighted: 1,
        ballotCount: 1
      },
      {
        id: 'opt-abstain',
        text: 'Enthaltung / Abstain',
        votesWeighted: 2,
        ballotCount: 0
      }
    ]
  }
];

export const INITIAL_BOARD_INQUIRIES: BoardInquiry[] = [
  {
    id: 'inq-1',
    title: 'Long-term community center lease negotiations in Frankfurt / Rhein-Main',
    content:
      'Could the board provide an update regarding our community gathering space in Frankfurt? Are we currently negotiating a multi-year lease extension with the landlord, and will the monthly rent cost be locked against heating inflation?',
    category: 'Mosque & Facility',
    authorName: 'Bambang Sudirman',
    authorMemberCode: 'PI-7740',
    authorCategory: 'personal',
    submittedAt: '2026-09-02T16:40:00Z',
    status: 'answered',
    upvoteCount: 4,
    boardResponse: {
      answeredBy: 'Dr. H. Aam Amiruddin (Board Chairman)',
      answeredAt: '2026-09-04T10:15:00Z',
      responseText:
        'Assalamu’alaikum wr. wb. The Board met with the property administrator last week. We have reached an agreement in principle for a 3-year extension until December 2029. Warm rental indexation will be capped at max 2.5% per annum. A copy of the draft contract will be placed in the GA minutes.'
    }
  },
  {
    id: 'inq-2',
    title: 'Proposal for Bilingual (German & Indonesian) Halaqah Curriculum for Teenagers (16+)',
    content:
      'Many of our youth born and raised in Europe (e.g. Germany & Switzerland) are more fluent in German/English for conceptual Islamic discussions than Indonesian. Could the board create a dedicated youth halaqah led by young mentors in German alongside Indonesian references?',
    category: 'Programs & Tarbiyah',
    authorName: 'Ridwan Kamil Santoso',
    authorMemberCode: 'PI-FAM-2021',
    authorCategory: 'family',
    submittedAt: '2026-09-06T14:10:00Z',
    status: 'agenda_item',
    upvoteCount: 5,
    boardResponse: {
      answeredBy: 'Tarbiyah & Education Department',
      answeredAt: '2026-09-08T09:00:00Z',
      responseText:
        'Jazakallahu khairan Akhi Ridwan. The Tarbiyah committee wholeheartedly agrees. Brother Farhan Amiruddin and brother Ahmad Fauzi are already piloting this bilingual curriculum. This proposal has been formally designated as an official General Assembly Agenda item.'
    }
  },
  {
    id: 'inq-3',
    title: 'Audit and verified distribution channels for International Zakat & Emergency Aid',
    content:
      'We would appreciate an overview of which partner foundations are deployed for our Zakat Fitrah, Zakat Mal, and humanitarian relief in Palestine and Indonesia, and whether external audit certificates are received annually.',
    category: 'Finance & Audit',
    authorName: 'Ahmad Fauzi Rahman',
    authorMemberCode: 'PI-STU-8821',
    authorCategory: 'personal',
    submittedAt: '2026-09-09T18:30:00Z',
    status: 'answered',
    upvoteCount: 2,
    boardResponse: {
      answeredBy: 'Treasurer & Zakat Committee',
      answeredAt: '2026-09-11T12:00:00Z',
      responseText:
        'Every cent of zakat collected is transferred directly via registered charitable partners (e.g. Yayasan Percikan Iman Bandung & Swiss-registered relief NGOs). Certified receipt vouchers and distribution photo logs are accessible in the member transparency ledger.'
    }
  }
];
