export type NavScreen = 'programs' | 'donate' | 'login' | 'home' | 'about' | 'contact' | 'member' | 'gallery' | 'assembly' | 'brand';

export type AdminTabId =
  | 'programs'
  | 'events'
  | 'content'
  | 'board'
  | 'donations'
  | 'members'
  | 'attendance'
  | 'assembly'
  | 'bootstrap';

export interface EventPhoto {
  id: string;
  title: string;
  eventTitle: string;
  category: 'Familienlager' | 'Pengajian' | 'Ramadan & Eid' | 'Youth & Education' | 'Charity & Qurban';
  date: string;
  year: number;
  location: string;
  imageUrl: string;
  description: string;
  attendeesCount?: number;
  tags: string[];
  photographer?: string;
}

export interface Program {
  id: string;
  title: string;
  category: 'Religious' | 'Social Impact' | 'Youth' | 'Health' | 'Transparency' | 'Community';
  tag: string;
  tagColor?: string;
  iconName: string;
  description: string;
  imageUrl: string;
  dateOrSchedule: string;
  location: string;
  participantsCount?: string;
  detailedOverview: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  currentAmount: number;
  goalAmount: number;
  isCritical?: boolean;
  tag?: string;
  iconName?: string;
  imageUrl?: string;
  beneficiaries?: string;
}

export interface ContributionDestination {
  id: string;
  name: string;
  shortLabel: string;
  category: string;
  description: string;
  totalCollected?: number;
}

export interface DonationReport {
  id: string;
  donorName: string;
  email: string;
  amount: number;
  currency?: string;
  destination: string;
  date: string;
  paymentMethod: string;
  status: 'Completed' | 'Processing' | 'Flagged';
  notes?: string;
  sourcePledgeId?: string;
}

export interface DonationPledge {
  id: string;
  donorName: string;
  email: string;
  amount: number;
  currency: 'CHF';
  destination: string;
  date: string;
  paymentMethod: string;
  status: 'Processing' | 'Promoted' | 'Rejected';
  notes?: string;
  promotedReportId?: string;
}

export interface SiteNotice {
  enabled: boolean;
  message: string;
  badge: string;
  linkText?: string;
  linkScreen?: NavScreen;
}

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  department: string;
  imageUrl: string;
  bio: string;
  email?: string;
  phone?: string;
  order?: number;
}

export interface CommunityEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. '08:30 - 11:30'
  category: 'Majelis & Spiritual' | 'Charity & Relief' | 'Youth & Education' | 'Community Gathering';
  location: string;
  isOnline?: boolean;
  onlineLink?: string;
  speaker?: string;
  description: string;
  capacity?: number;
  registeredCount?: number;
  featured?: boolean;
  imageUrl?: string;
  regularFee?: number; // e.g. €20 for non-members
  memberSubsidizedFee?: number; // e.g. €0 or €5 subsidized for active & fee-exempt members
}

export type MembershipCategory = 'personal' | 'family';

export type MembershipStatus = 'active' | 'pending_payment' | 'relocated' | 'fee_paused' | 'inactive';
export type PaymentMethod = 'twint' | 'bank_transfer' | 'cash' | 'exempt';
export type PaymentStatus = 'paid' | 'pending_payment' | 'exempt';

export interface CategoryChangeRequest {
  requestedCategory: MembershipCategory;
  requestedAt: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface FeeExemptionInfo {
  isExempt: boolean;
  votedYear?: number;
  exemptionYear?: number;
  approvedByGA?: boolean;
  resolutionRef?: string;
  exemptionReason?: string;
  validUntil?: string;
  retainsBenefits: boolean; // Fee exemptions do not lose benefits like subsidized event fees
}

export interface FormalStatusRecord {
  id: string;
  status: MembershipStatus;
  effectiveDate: string;
  reason: string;
  recordedBy: string;
  documentRef?: string;
  dateLogged: string;
}

export interface FormalStatusChangeRequest {
  requestedStatus: MembershipStatus;
  reason: string;
  effectiveDate: string;
  submittedAt: string;
  destinationCountry?: string;
  status: 'submitted_to_board' | 'acknowledged' | 'approved';
  notes?: string;
}

export interface FamilyChild {
  id: string;
  name: string;
  birthYear?: string;
  relation?: string;
  notes?: string;
}

export interface FamilySpouse {
  name: string;
  email?: string;
  phone?: string;
}

export interface MemberAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface UserAccount {
  uid?: string;
  emailVerified?: boolean;
  authProvider?: 'password' | 'google';
  name: string;
  email: string;
  phone?: string;
  address?: MemberAddress;
  interest?: string;
  memberCode?: string;
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  canScanQR?: boolean;
  canManageBoard?: boolean;
  joinedAt?: string;
  avatarUrl?: string;
  // Membership categorization
  membershipCategory?: MembershipCategory; // 'personal' | 'family'
  membershipStatus?: MembershipStatus; // 'active' | 'relocated' | 'fee_paused' | 'inactive'
  statusReason?: string;
  statusChangeDate?: string;
  spouse?: FamilySpouse;
  children?: FamilyChild[]; // Up to 5 children
  
  // Yearly contribution (membership contribution is yearly)
  yearlyContribution?: number; // e.g. CHF 80/year (personal) or CHF 120/year (family) or CHF 0 (fee-exempt)
  monthlyFee?: number; // kept for backwards compatibility

  // Year-end expiration & General Assembly (GA) validity
  membershipYear?: number; // e.g. 2026
  validUntil?: string; // e.g. '31 Dec 2026 (Subject to GA Renewal)'
  gaApprovalStatus?: 'approved_current_year' | 'pending_ga_renewal' | 'expired_at_year_end';
  lastGaResolutionRef?: string;

  // Category change request (requires admin approval)
  categoryChangeRequest?: CategoryChangeRequest;

  // Fee exemption (voted on yearly by General Assembly, retains full benefits like subsidized event fees)
  feeExemption?: FeeExemptionInfo;

  // Formal status change management
  pendingStatusRequest?: FormalStatusChangeRequest;
  formalStatusHistory?: FormalStatusRecord[];

  // Registration acknowledgments & Payment settlement
  acknowledgedEmailNotices?: boolean;
  acknowledgedMembershipFee?: boolean;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  paymentVerifiedBy?: string;
  paymentReference?: string;

  // Board-certified General Assembly voting weight (protected in firestore.rules)
  verifiedVoteWeight?: number;
  voteWeightVerifiedAt?: string;
  voteWeightVerifiedBy?: string;
}

// Attendance Tracking for Events via QR Scanner
export interface EventAttendanceRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  memberCode: string;
  memberName: string;
  memberEmail?: string;
  category: MembershipCategory;
  status: MembershipStatus;
  isFeeExempt: boolean;
  partyCount: number;
  partyMembers: string[];
  scannedAt: string; // ISO string
  scannedBy: string; // Admin operator name
  feePaidChf: number; // 0 for members/exempt, or subsidized
  verified: boolean;
  notes?: string;
}

// --- GENERAL ASSEMBLY (GA) & VOTING SYSTEM ---

export type QuestionStatus = 'draft' | 'on_floor' | 'closed';
export type QuestionType = 'yes_no_abstain' | 'multiple_choice';
export type QuestionCategory =
  | 'Budget & Financial'
  | 'Statute Amendment'
  | 'Board Election'
  | 'Community Project'
  | 'General Resolution';

export interface GASessionState {
  isOpen: boolean; // Portal is only open on the day of GA
  sessionTitle: string;
  scheduledDate: string;
  activeQuestionId: string | null; // Like in parliament: admin raises questions individually
  openedAt?: string;
  closedAt?: string;
  openedBy?: string;
  location?: string;
}

export interface VotingOption {
  id: string;
  text: string;
  votesWeighted: number; // Sum of family weights + individual weights
  ballotCount: number;   // Number of ballots cast for this option
}

export interface CastBallotBreakdown {
  primaryEligible: boolean;
  spouseEligible: boolean;
  eligibleChildrenNames: string[];
  ineligibleChildrenNames: string[];
}

export interface CastBallot {
  id: string;
  questionId: string;
  memberName: string;
  memberCode: string;
  membershipCategory: MembershipCategory;
  voteWeight: number; // Family weight: 1 + (spouse ? 1 : 0) + (children >= 16)
  votedOptionId: string;
  timestamp: string; // ISO string
  breakdown: CastBallotBreakdown;
}

export interface AssemblyQuestionFinalResults {
  totalWeight: number;
  totalBallots: number;
  closedAt: string;
  closedBy: string;
  optionTotals: Record<string, number>;
}

export interface AssemblyQuestion {
  id: string;
  title: string;
  description: string;
  category: QuestionCategory;
  status: QuestionStatus; // 'draft' (prepared in advance) | 'on_floor' (live vote) | 'closed' (vote completed)
  type: QuestionType;
  options: VotingOption[];
  optionIds?: string[];
  totalVotesWeighted: number;
  totalBallots: number;
  agendaOrder?: number;
  createdAt: string;
  openedAt?: string;
  closedAt?: string;
  createdBy: string; // Admin name
  quorumRequiredPercent: number; // e.g. 50% for simple majority, 66.7% for statute amendment
  statuteArticleRef?: string; // e.g. 'Art. 12 Abs. 3 ZGB / Art. 16 Statuten'
  finalResults?: AssemblyQuestionFinalResults;
}

// --- QUESTIONS TO THE BOARD (MEMBER INQUIRIES) ---

export type BoardInquiryStatus = 'submitted' | 'under_review' | 'agenda_item' | 'answered';
export type BoardInquiryCategory =
  | 'Finance & Audit'
  | 'Programs & Tarbiyah'
  | 'Mosque & Facility'
  | 'Statute & Governance'
  | 'General';

export interface BoardResponse {
  answeredBy: string;
  answeredAt: string;
  responseText: string;
}

export interface BoardInquiry {
  id: string;
  title: string;
  content: string;
  category: BoardInquiryCategory;
  authorUid?: string;
  authorName: string;
  authorMemberCode: string;
  authorCategory: MembershipCategory;
  submittedAt: string;
  status: BoardInquiryStatus;
  upvoteCount?: number;
  hasUpvoted?: boolean;
  boardResponse?: BoardResponse;
  convertedToQuestionId?: string; // If board escalated this to an assembly voting motion
}

export interface BootstrapMetadata {
  seededAt: string;
  seededBy: string;
  version: string;
}

// --- VOTING POWER BREAKDOWN INTERFACES ---

export interface VotingPowerPerson {
  name: string;
  relation: string;
  birthYear?: string;
  age?: number;
  isEligible: boolean;
  ineligibleReason?: string;
}

export interface VotingPowerResult {
  isMember: boolean;
  isEligibleToVote: boolean;
  ineligibilityReason?: string;
  totalVotes: number;
  category: MembershipCategory;
  persons: VotingPowerPerson[];
  summaryText: string;
}


