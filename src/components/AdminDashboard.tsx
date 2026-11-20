import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  Landmark,
  Mail,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { BOARD_DEPARTMENTS, PRESET_BOARD_AVATARS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import {
  deleteBoardMember,
  deleteCampaign,
  deleteDestination,
  deleteProgram,
  formatFirestoreError,
  isValidEmailFormat,
  isValidFirestoreImageUrl,
  normalizeSafeHttpUrl,
  saveBoardMember,
  saveCampaign,
  saveDestination,
  saveProgram,
  saveSiteNotice,
  subscribeBoardMembers,
  subscribeCampaigns,
  subscribeDestinations,
  subscribePrograms,
  subscribeSiteNotice
} from '../lib/firestoreContent';
import {
  createManualDonationReport,
  promotePledgeToReport,
  rejectDonationPledge,
  subscribeDonationPledges,
  subscribeDonationReports
} from '../lib/firestoreDonations';
import { isSafeHttpUrl } from '../lib/urlValidation';
import {
  BoardMember,
  Campaign,
  ContributionDestination,
  DonationPledge,
  DonationReport,
  NavScreen,
  Program,
  SiteNotice
} from '../types';
import { PhotoUpload } from './PhotoUpload';

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

export type AdminDashboardSection = 'programs' | 'content' | 'board' | 'donations';

interface AdminDashboardProps {
  activeTab?: AdminDashboardSection;
}

const PRESET_PROGRAM_IMAGES = [
  {
    label: 'Auditorium Lecture',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApEOa9P2Qx1cfP-WmL0k_266zgknq15mMa3AdkLEgZUaRjvlZyN3lQJ8x99uwPIVyLkkuNcVnHk2A_-aqrQ-6SK_JZSZrnxGl1gqKMFhD3dub639fk3DKOaInoH66jmTIQ3FIilPsz6xN84YTzaTzH17s4hlX4IofIiFN2icBdbRmzGn8X4ldhA8s3WZUsbWXHNyxh5ZZ1J07P-uUZmisZRH3Q9JP_EjrjpfvdPoG3ypWub95yVH6FX_JwvKJRzByHwAedCpxDvlg3'
  },
  {
    label: 'Community Food Kitchen',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqyG9Uq2Yh-CMB-fMIEyd4V13gQaeNchOqkLRQX_rceGPLQ05vI48m_Vkm7X_1JhO_0a27d5EWf9tTgHpwQeSCxhYf4eTMhCYCFa7JYurIaS755_nMFnqix8-lbmSAPTZvWe42QwsGQVesbMQxsGSd2ZwKneDr5uIA56DB88wLsJR_z9FoSL4siQEM7x69bU9aHDY9cBukKtkBvwk7C44tlHo0cadpYBaRqzkSzA1bpijKKxOCr_ic2HmQaq4GWu3ts5x9_WL6qw9Q'
  },
  {
    label: 'Youth Leadership Camp',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAp2bIY3jxhBXimEwMcyQJTRmy_ZWvEtki1jYQfhu1kubDAu-ot5c4JXdOG08LvioC1I72Xq0b2mene91B4JOfkGvnli5qAD-h-bNlmn2L3UXb6PDvu6ne_3t2w01coisrrjWD4nn29I2KzD_TBOICwOswdoQjNXZo1NXYyRxnZIzDafUD6eRHtkBVulSUUmTDXCy7lgXaxWKAI1fZNr_BTSmYtxacu0vDfRe24FcGsJmZw46PhOkupw_uz9mW2mLQbxxNJR9zl11ba'
  },
  {
    label: 'Medical Health Clinic',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMmX9rT2gKlhJT7xQXZ2d4dCK6mkU0Y8pdsk5V76mLjRpIX3A3AdS-z3dEoJclPA5xW_IT9DIzZnmj6Xn4j8R_iTJwSdTSDfHw7SgG_qDqdPdzx7iT7SRcJi5fZ6h_a_2ba_zsbutSAxlZdvopLR4qahrpHeV3juoYAEvr7_45_Q8v9C-vhKr0u-qVBD_YF3DPmXWg99GohVAs4E5jU9sxnm6vFVSwr-TT1c_YaxFM-vjQvp9kZ4aVfKrbCLSs0uft3GbFxj4JXAch'
  },
  {
    label: 'Seminar & Transparency',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTXF_2lN2tO5Rp5KVafwSAXMZFXE2AAm5VXd4iAHeMpaZF1wNL35MuV-UHR6jWFxWKfiAKbBdeQXSGZp_2A563KnJacBSdHgxHKb7R0HAEC5CJY9EFTzC97U0UG8eGKeYJ2k6oOOh6A7OW5yO--Xg5rJnulMNdw_85_08pXyydzP-SJstnUmEamz5pdlHVT5dOtYvhiZn1mWJb_pQOoM98R1WLwlhYyV7ucRVGfPTE-74L06zYUCU4_MoNHUON87VEYpaPG80zX1vK'
  },
  {
    label: 'Family Gathering Outdoors',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5uWNbnRJUEUc_XFo2N4hUkVW02ViG7Vx0ceg61-p-ZaEDjxH1oBK7NqwhFFHUdHRASrQbif7bJmBydmfM8_aGVrM2iD6z4l_B4ditEeR4TKjP_jBgdmlcJ4J5Jqys_LVrzX29V85iqpBFq2dL8UK_CNYjp1OWW66JJrA5pdNhX5MI0DESQbFGUaFKF-8jzSQz2mkf8uxItCzznYz-VtZsh1_Zmq_zZluDeUFnE0-1bprGqVQ44_XClfkmEt_S9H_kXtMYRIJiOdif'
  }
];

const NOTICE_LINK_SCREENS = [
  'home',
  'programs',
  'donate',
  'gallery',
  'about',
  'contact',
  'login',
  'member',
  'assembly',
  'brand'
] as const;

const DEFAULT_NOTICE: SiteNotice = {
  enabled: false,
  badge: 'Announcement',
  message: '',
  linkText: '',
  linkScreen: 'programs'
};

function validateImageField(url: string, required: boolean): string | null {
  const normalized = normalizeSafeHttpUrl(url || '');
  if (!normalized) {
    return required ? 'An image URL or uploaded raster image is required.' : null;
  }
  if (normalized.startsWith('data:')) {
    if (!isValidFirestoreImageUrl(normalized)) {
      return 'Uploaded image must be PNG, JPEG, WEBP, or GIF under 500 KB (SVG is not supported).';
    }
    return null;
  }
  if (
    !isSafeHttpUrl(normalized) ||
    normalized.length < 8 ||
    normalized.length > 2048 ||
    /\s/.test(normalized)
  ) {
    return 'Image URL must use http:// or https://, be 8–2048 characters, and contain no spaces or embedded credentials.';
  }
  return null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab
}) => {
  const auth = useOptionalAuth();
  const { t } = useLanguage();

  const resolvedUser = auth?.currentUser ?? null;
  const actorName = (
    resolvedUser?.name ||
    resolvedUser?.email ||
    'Board Administrator'
  ).slice(0, 150);

  const activeSection: AdminDashboardSection = activeTab ?? 'programs';

  // Section-scoped Firestore subscription state
  const [fsPrograms, setFsPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);

  const [fsCampaigns, setFsCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  const [fsDestinations, setFsDestinations] = useState<ContributionDestination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);

  const [fsSiteNotice, setFsSiteNotice] = useState<SiteNotice | null>(null);
  const [siteNoticeLoading, setSiteNoticeLoading] = useState(true);

  const [fsBoardMembers, setFsBoardMembers] = useState<BoardMember[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  const [fsPledges, setFsPledges] = useState<DonationPledge[]>([]);
  const [pledgesLoading, setPledgesLoading] = useState(false);

  const [fsReports, setFsReports] = useState<DonationReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const busyPledgeRef = useRef(false);
  const deletingIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pledge queue state
  const [pledgeStatusFilter, setPledgeStatusFilter] = useState<
    'Processing' | 'Promoted' | 'Rejected' | 'All'
  >('Processing');
  const [busyPledgeId, setBusyPledgeId] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    const unsubs: Array<() => void> = [];

    if (activeSection === 'programs') {
      unsubs.push(
        subscribePrograms((res) => {
          setFsPrograms(res.data);
          setProgramsLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
    } else if (activeSection === 'content') {
      unsubs.push(
        subscribeCampaigns((res) => {
          setFsCampaigns(res.data);
          setCampaignsLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
      unsubs.push(
        subscribeDestinations((res) => {
          setFsDestinations(res.data);
          setDestinationsLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
      setSiteNoticeLoading(true);
      isNoticeDirtyRef.current = false;
      noticeEditSeqRef.current += 1;
      unsubs.push(
        subscribeSiteNotice((res) => {
          setFsSiteNotice(res.data);
          setSiteNoticeLoading(res.loading);
          if (!res.loading && !isNoticeDirtyRef.current) {
            const nextNotice = res.data ?? DEFAULT_NOTICE;
            setNoticeForm({
              enabled: Boolean(nextNotice.enabled),
              badge: nextNotice.badge || '',
              message: nextNotice.message || '',
              linkText: nextNotice.linkText || '',
              linkScreen: nextNotice.linkScreen || 'programs'
            });
          }
          if (res.error) setLoadError(res.error);
        })
      );
    } else if (activeSection === 'board') {
      unsubs.push(
        subscribeBoardMembers((res) => {
          setFsBoardMembers(res.data);
          setBoardLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
    } else if (activeSection === 'donations') {
      unsubs.push(
        subscribeDonationPledges(
          (res) => {
            setFsPledges(res.data);
            setPledgesLoading(res.loading);
            if (res.error) setLoadError(res.error);
          },
          pledgeStatusFilter === 'All' ? undefined : { status: pledgeStatusFilter }
        )
      );
      unsubs.push(
        subscribeDonationReports((res) => {
          setFsReports(res.data);
          setReportsLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
      unsubs.push(
        subscribeDestinations((res) => {
          setFsDestinations(res.data);
          setDestinationsLoading(res.loading);
          if (res.error) setLoadError(res.error);
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeSection, pledgeStatusFilter]);

  useEffect(() => {
    setEditingProgram(null);
    setIsCreatingProgram(false);
    setEditingCampaign(null);
    setIsCreatingCampaign(false);
    setIsCreatingDestination(false);
    setEditingBoardMember(null);
    setIsCreatingBoardMember(false);
    setIsManualDonationModalOpen(false);
    setModalError(null);
  }, [activeSection]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const programs = fsPrograms;
  const campaigns = fsCampaigns;
  const destinations = fsDestinations;
  const donationReports = fsReports;
  const boardMembers = fsBoardMembers;
  const resolvedSiteNotice = fsSiteNotice ?? DEFAULT_NOTICE;

  const showToast = (msg: string) => {
    setActionError(null);
    setActionSuccess(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setActionSuccess(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  // Board State
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMember | null>(null);
  const [isCreatingBoardMember, setIsCreatingBoardMember] = useState(false);
  const [boardMemberForm, setBoardMemberForm] = useState<Partial<BoardMember>>({
    department: 'Executive Leadership',
    imageUrl: PRESET_BOARD_AVATARS[0].url
  });
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardFilterDept, setBoardFilterDept] = useState('All Departments');

  // Program State
  const [programSearch, setProgramSearch] = useState('');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [programForm, setProgramForm] = useState<Partial<Program>>({
    category: 'Religious',
    tag: 'Active',
    iconName: 'volunteer_activism'
  });

  // Campaign State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState<Partial<Campaign>>({
    progressPercent: 50,
    currentAmount: 10000,
    goalAmount: 25000,
    isCritical: false
  });

  // Destination State
  const [isCreatingDestination, setIsCreatingDestination] = useState(false);
  const [destinationForm, setDestinationForm] = useState<Partial<ContributionDestination>>({
    category: 'Community Aid'
  });

  // Notice State synced from Firestore
  const [noticeForm, setNoticeForm] = useState<SiteNotice>(resolvedSiteNotice);
  const isNoticeDirtyRef = useRef(false);
  const noticeEditSeqRef = useRef(0);
  const [noticeSavedAlert, setNoticeSavedAlert] = useState(false);

  const updateNoticeField = <K extends keyof SiteNotice>(field: K, value: SiteNotice[K]) => {
    isNoticeDirtyRef.current = true;
    noticeEditSeqRef.current += 1;
    setNoticeForm((prev) => ({ ...prev, [field]: value }));
  };

  // Donation Reports Filter & Manual Donation State
  const [reportFilterDestination, setReportFilterDestination] = useState<string>('All');
  const [reportSearch, setReportSearch] = useState<string>('');
  const [isManualDonationModalOpen, setIsManualDonationModalOpen] = useState(false);
  const [manualDonation, setManualDonation] = useState({
    donorName: '',
    email: '',
    amount: 100,
    destination: destinations[0]?.name || 'The Verein itself (Percikan Iman)',
    paymentMethod: 'Cash / Secretariat Office',
    notes: 'In-person contribution'
  });

  useEffect(() => {
    if (
      destinations.length > 0 &&
      !destinations.some((d) => d.name === manualDonation.destination)
    ) {
      setManualDonation((prev) => ({ ...prev, destination: destinations[0].name }));
    }
  }, [destinations, manualDonation.destination]);

  const totalDonationsAmount = useMemo(() => {
    return donationReports.reduce((acc, curr) => acc + curr.amount, 0);
  }, [donationReports]);

  const totalTransactionsCount = donationReports.length;

  const averageDonation = useMemo(() => {
    return totalTransactionsCount > 0
      ? Math.round(totalDonationsAmount / totalTransactionsCount)
      : 0;
  }, [totalDonationsAmount, totalTransactionsCount]);

  const destinationDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    donationReports.forEach((d) => {
      map[d.destination] = (map[d.destination] || 0) + d.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [donationReports]);

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    return donationReports.filter((r) => {
      const matchesDest =
        reportFilterDestination === 'All' || r.destination === reportFilterDestination;
      const matchesSearch =
        !q ||
        (r.donorName || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.destination || '').toLowerCase().includes(q);
      return matchesDest && matchesSearch;
    });
  }, [donationReports, reportFilterDestination, reportSearch]);

  const filteredBoardMembers = useMemo(() => {
    const q = boardSearchQuery.trim().toLowerCase();
    return boardMembers.filter((m) => {
      const matchDept =
        boardFilterDept === 'All Departments' || m.department === boardFilterDept;
      const matchQuery =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q) ||
        (m.bio || '').toLowerCase().includes(q);
      return matchDept && matchQuery;
    });
  }, [boardMembers, boardFilterDept, boardSearchQuery]);

  // --- Program Handlers ---
  const handleOpenCreateProgram = () => {
    setActionError(null);
    setModalError(null);
    setProgramForm({
      id: `prog-${Date.now()}`,
      title: '',
      category: 'Religious',
      tag: 'New Program',
      iconName: 'volunteer_activism',
      description: '',
      detailedOverview: '',
      dateOrSchedule: 'Every Saturday, 10:00 - 12:00',
      location: 'Percikan Iman Community Center',
      participantsCount: '100+ Participants',
      imageUrl: PRESET_PROGRAM_IMAGES[0].url
    });
    setIsCreatingProgram(true);
    setEditingProgram(null);
  };

  const handleOpenEditProgram = (prog: Program) => {
    setActionError(null);
    setModalError(null);
    setEditingProgram(prog);
    setProgramForm({ ...prog });
    setIsCreatingProgram(false);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setModalError(null);
    setActionError(null);
    if (!programForm.title?.trim()) {
      setModalError('Program title is required.');
      return;
    }
    const imgErr = validateImageField(programForm.imageUrl || '', true);
    if (imgErr) {
      setModalError(imgErr);
      return;
    }

    const payload: Program = {
      id: editingProgram?.id || programForm.id || `prog-${Date.now()}`,
      title: programForm.title.trim(),
      category: (programForm.category || 'Religious') as Program['category'],
      tag: (programForm.tag || '').trim(),
      tagColor: programForm.tagColor,
      iconName: programForm.iconName || 'volunteer_activism',
      description: (programForm.description || '').trim(),
      imageUrl: normalizeSafeHttpUrl(programForm.imageUrl || ''),
      dateOrSchedule: (programForm.dateOrSchedule || '').trim(),
      location: (programForm.location || '').trim(),
      participantsCount: programForm.participantsCount?.trim() || undefined,
      detailedOverview: (programForm.detailedOverview || '').trim()
    };

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveProgram(payload);
      setEditingProgram(null);
      setIsCreatingProgram(false);
      setModalError(null);
      showToast(`Saved program "${payload.title}".`);
    } catch (err) {
      setModalError(formatFirestoreError(err, 'Failed to save program.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteProgram = async (id: string, title: string) => {
    if (deletingIdsRef.current.has(id)) return;
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    deletingIdsRef.current.add(id);
    setActionError(null);
    try {
      await deleteProgram(id);
      showToast(`Deleted program "${title}".`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete program.'));
    } finally {
      deletingIdsRef.current.delete(id);
    }
  };

  // --- Campaign Handlers ---
  const handleOpenCreateCampaign = () => {
    setActionError(null);
    setModalError(null);
    setCampaignForm({
      id: `camp-${Date.now()}`,
      title: '',
      description: '',
      progressPercent: 20,
      currentAmount: 5000,
      goalAmount: 25000,
      isCritical: false,
      tag: 'COMMUNITY NEED',
      beneficiaries: 'Local community families',
      imageUrl: ''
    });
    setIsCreatingCampaign(true);
    setEditingCampaign(null);
  };

  const handleOpenEditCampaign = (camp: Campaign) => {
    setActionError(null);
    setModalError(null);
    setEditingCampaign(camp);
    setCampaignForm({ ...camp });
    setIsCreatingCampaign(false);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setModalError(null);
    setActionError(null);
    if (!campaignForm.title?.trim()) {
      setModalError('Campaign title is required.');
      return;
    }

    const imgErr = validateImageField(campaignForm.imageUrl || '', false);
    if (imgErr) {
      setModalError(imgErr);
      return;
    }

    const goalAmount = Number(campaignForm.goalAmount);
    if (!Number.isFinite(goalAmount) || goalAmount < 1 || goalAmount > 100_000_000) {
      setModalError('Target goal amount (CHF) must be between 1 and 100,000,000.');
      return;
    }
    const currentAmount = Math.max(0, Number(campaignForm.currentAmount) || 0);
    const computedProgress = Math.min(1000, Math.round((currentAmount / goalAmount) * 100));

    const payload: Campaign = {
      id: editingCampaign?.id || campaignForm.id || `camp-${Date.now()}`,
      title: campaignForm.title.trim(),
      description: (campaignForm.description || '').trim(),
      currentAmount,
      goalAmount,
      progressPercent: computedProgress,
      isCritical: Boolean(campaignForm.isCritical),
      tag: campaignForm.tag?.trim() || undefined,
      iconName: campaignForm.iconName?.trim() || undefined,
      imageUrl: campaignForm.imageUrl?.trim()
        ? normalizeSafeHttpUrl(campaignForm.imageUrl)
        : undefined,
      beneficiaries: campaignForm.beneficiaries?.trim() || undefined
    };

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveCampaign(payload);
      setEditingCampaign(null);
      setIsCreatingCampaign(false);
      setModalError(null);
      showToast(`Saved campaign "${payload.title}".`);
    } catch (err) {
      setModalError(formatFirestoreError(err, 'Failed to save campaign.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (deletingIdsRef.current.has(id)) return;
    if (!window.confirm(`Remove the "${title}" campaign?`)) return;
    deletingIdsRef.current.add(id);
    setActionError(null);
    try {
      await deleteCampaign(id);
      showToast(`Deleted campaign "${title}".`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete campaign.'));
    } finally {
      deletingIdsRef.current.delete(id);
    }
  };

  // --- Destination Handlers ---
  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setModalError(null);
    setActionError(null);
    if (!destinationForm.name?.trim()) {
      setModalError('Destination name is required.');
      return;
    }

    const newDest: ContributionDestination = {
      id: `dest-${Date.now()}`,
      name: destinationForm.name.trim(),
      shortLabel: destinationForm.shortLabel?.trim() || destinationForm.name.trim(),
      category: destinationForm.category?.trim() || 'Special Fund',
      description:
        destinationForm.description?.trim() || 'Designated community welfare cause.',
      totalCollected: 0
    };

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveDestination(newDest);
      setDestinationForm({ category: 'Community Aid' });
      setIsCreatingDestination(false);
      setModalError(null);
      showToast(`Added contribution destination "${newDest.name}".`);
    } catch (err) {
      setModalError(formatFirestoreError(err, 'Failed to save destination.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteDestination = async (id: string, name: string) => {
    if (deletingIdsRef.current.has(id)) return;
    if (!window.confirm(`Remove destination "${name}"?`)) return;
    deletingIdsRef.current.add(id);
    setActionError(null);
    try {
      await deleteDestination(id);
      showToast(`Removed destination "${name}".`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete destination.'));
    } finally {
      deletingIdsRef.current.delete(id);
    }
  };

  // --- Site Notice Handler ---
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setActionError(null);
    isSavingRef.current = true;
    setIsSaving(true);
    const seqAtSaveStart = noticeEditSeqRef.current;
    try {
      const payload: SiteNotice = {
        enabled: Boolean(noticeForm.enabled),
        badge: noticeForm.badge.trim(),
        message: noticeForm.message.trim(),
        linkText: noticeForm.linkText?.trim() || undefined,
        linkScreen: noticeForm.linkText?.trim() ? noticeForm.linkScreen : undefined
      };
      await saveSiteNotice(payload);
      setFsSiteNotice(payload);
      if (noticeEditSeqRef.current === seqAtSaveStart) {
        isNoticeDirtyRef.current = false;
      }
      setNoticeSavedAlert(true);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => {
        setNoticeSavedAlert(false);
        noticeTimerRef.current = null;
      }, 3000);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to save site notice.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // --- Board Member Handlers ---
  const handleOpenCreateBoardMember = () => {
    setActionError(null);
    setModalError(null);
    setBoardMemberForm({
      id: `board-${Date.now()}`,
      name: '',
      role: '',
      department: 'Executive Leadership',
      imageUrl: PRESET_BOARD_AVATARS[0].url,
      bio: '',
      email: '',
      order: boardMembers.length + 1
    });
    setIsCreatingBoardMember(true);
    setEditingBoardMember(null);
  };

  const handleOpenEditBoardMember = (member: BoardMember) => {
    setActionError(null);
    setModalError(null);
    setBoardMemberForm({ ...member });
    setEditingBoardMember(member);
    setIsCreatingBoardMember(false);
  };

  const handleSaveBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setModalError(null);
    setActionError(null);
    if (!boardMemberForm.name?.trim() || !boardMemberForm.role?.trim()) {
      setModalError('Board member name and role are required.');
      return;
    }

    const imgErr = validateImageField(boardMemberForm.imageUrl || '', true);
    if (imgErr) {
      setModalError(imgErr);
      return;
    }

    const payload: BoardMember = {
      id: editingBoardMember?.id || boardMemberForm.id || `board-${Date.now()}`,
      name: boardMemberForm.name.trim(),
      role: boardMemberForm.role.trim(),
      department: boardMemberForm.department || 'Executive Leadership',
      imageUrl: normalizeSafeHttpUrl(boardMemberForm.imageUrl || ''),
      bio: (boardMemberForm.bio || '').trim(),
      email: boardMemberForm.email?.trim() || undefined,
      phone: boardMemberForm.phone?.trim() || undefined,
      order: Number(boardMemberForm.order) || boardMembers.length + 1
    };

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveBoardMember(payload);
      setEditingBoardMember(null);
      setIsCreatingBoardMember(false);
      setModalError(null);
      showToast(`Saved board profile for "${payload.name}".`);
    } catch (err) {
      setModalError(formatFirestoreError(err, 'Failed to save board member.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteBoardMember = async (id: string, name: string) => {
    if (deletingIdsRef.current.has(id)) return;
    if (!window.confirm(`Remove "${name}" from the Board of Directors?`)) return;
    deletingIdsRef.current.add(id);
    setActionError(null);
    try {
      await deleteBoardMember(id);
      showToast(`Removed "${name}" from board roster.`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to remove board member.'));
    } finally {
      deletingIdsRef.current.delete(id);
    }
  };

  // --- Donations & Pledges Handlers ---
  const handlePromotePledge = async (pledge: DonationPledge) => {
    if (busyPledgeRef.current || busyPledgeId) return;
    busyPledgeRef.current = true;
    setActionError(null);
    setBusyPledgeId(pledge.id);
    try {
      const report = await promotePledgeToReport(pledge, actorName);
      showToast(`Promoted pledge ${pledge.id} to verified ledger (${report.id}).`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to promote donation pledge.'));
    } finally {
      busyPledgeRef.current = false;
      setBusyPledgeId(null);
    }
  };

  const handleRejectPledge = async (pledge: DonationPledge) => {
    if (busyPledgeRef.current || busyPledgeId) return;
    const reason = window.prompt(
      `Optional rejection reason for ${pledge.donorName} (CHF ${pledge.amount}):`,
      'Payment could not be verified'
    );
    if (reason === null) return;

    busyPledgeRef.current = true;
    setActionError(null);
    setBusyPledgeId(pledge.id);
    try {
      await rejectDonationPledge(pledge.id, reason);
      showToast(`Marked pledge ${pledge.id} as Rejected.`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to reject donation pledge.'));
    } finally {
      busyPledgeRef.current = false;
      setBusyPledgeId(null);
    }
  };

  const handleSaveManualDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setModalError(null);
    setActionError(null);
    if (!manualDonation.donorName.trim()) {
      setModalError('Donor name and CHF amount are required.');
      return;
    }

    const parsedAmount = Number(manualDonation.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1 || parsedAmount > 100_000) {
      setModalError('Donation amount must be between CHF 1 and CHF 100,000.');
      return;
    }

    const trimmedEmail = manualDonation.email.trim();
    if (trimmedEmail && !isValidEmailFormat(trimmedEmail)) {
      setModalError('Please enter a valid donor email address (or leave blank).');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await createManualDonationReport({
        donorName: manualDonation.donorName,
        email: trimmedEmail,
        amount: parsedAmount,
        currency: 'CHF',
        destination: manualDonation.destination,
        paymentMethod: manualDonation.paymentMethod,
        status: 'Completed',
        notes: manualDonation.notes
      });

      setIsManualDonationModalOpen(false);
      setModalError(null);
      setManualDonation({
        donorName: '',
        email: '',
        amount: 100,
        destination: destinations[0]?.name || 'The Verein itself (Percikan Iman)',
        paymentMethod: 'Cash / Secretariat Office',
        notes: 'In-person contribution'
      });
      showToast('Verified CHF offline donation recorded in ledger.');
    } catch (err) {
      setModalError(formatFirestoreError(err, 'Failed to record offline donation.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      setActionError('No donation records available to export.');
      return;
    }

    const escapeCsvCell = (val: unknown): string => {
      const str = String(val ?? '');
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Reference ID',
      'Date',
      'Donor Name',
      'Email',
      'Amount (CHF)',
      'Destination',
      'Payment Method',
      'Status',
      'Notes'
    ];
    const rows = filteredReports.map((r) => [
      escapeCsvCell(r.id),
      escapeCsvCell(r.date),
      escapeCsvCell(r.donorName),
      escapeCsvCell(r.email),
      r.amount,
      escapeCsvCell(r.destination),
      escapeCsvCell(r.paymentMethod),
      escapeCsvCell(r.status),
      escapeCsvCell(r.notes || '')
    ]);

    const csvText = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `percikan_iman_donation_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderDestinationsSection = () => (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#bec7d2]/60 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#121c2a] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#006191]" />
            <span>Contribution Destination Options ({destinations.length})</span>
          </h3>
          <p className="text-xs text-[#566771] mt-0.5">
            Options available in the public donation pledge form dropdown.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setModalError(null);
            setIsCreatingDestination(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#eff3ff] text-[#006191] hover:bg-[#d3e5f1] text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Destination
        </button>
      </div>

      {destinationsLoading ? (
        <p className="text-xs text-[#566771]">Loading contribution destinations...</p>
      ) : destinations.length === 0 ? (
        <p className="text-xs text-[#566771]">No contribution destinations configured yet.</p>
      ) : (
        <div className="divide-y divide-[#e6eeff]">
          {destinations.map((dest) => (
            <div key={dest.id} className="py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-[#121c2a] text-sm">{dest.name}</h4>
                  <span className="text-[10px] font-semibold bg-[#eff3ff] text-[#006191] px-2 py-0.5 rounded">
                    {dest.category}
                  </span>
                </div>
                <p className="text-xs text-[#566771] leading-relaxed max-w-2xl">
                  {dest.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteDestination(dest.id, dest.name)}
                className="p-1.5 text-[#ba1a1a] hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                title="Delete Destination"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {(loadError || actionError) && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{loadError || actionError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: PROGRAMS                                                         */}
      {/* ========================================================================= */}
      {activeSection === 'programs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#bec7d2]/60">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                placeholder="Search program listings by title, category, or venue..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-sm outline-none focus:border-[#006191]"
              />
              <Search className="w-4 h-4 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateProgram}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#006191] text-white rounded-lg text-sm font-bold hover:bg-[#007bb6] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Program</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 overflow-hidden shadow-2xs">
            {programsLoading ? (
              <div className="p-10 text-center text-xs text-[#566771]">
                Loading programs from Firestore...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eff3ff] text-xs font-bold text-[#121c2a] uppercase tracking-wider border-b border-[#bec7d2]/60">
                      <th className="py-3.5 px-4">Program &amp; Visual</th>
                      <th className="py-3.5 px-4">Category / Tag</th>
                      <th className="py-3.5 px-4">Schedule &amp; Venue</th>
                      <th className="py-3.5 px-4">Attendance</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6eeff] text-sm">
                    {programs
                      .filter(
                        (p) =>
                          (p.title || '').toLowerCase().includes(programSearch.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(programSearch.toLowerCase()) ||
                          (p.location || '').toLowerCase().includes(programSearch.toLowerCase())
                      )
                      .map((program) => (
                        <tr key={program.id} className="hover:bg-[#f9f9ff] transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={program.imageUrl}
                                alt={program.title}
                                className="w-14 h-14 rounded-lg object-cover border border-[#bec7d2]/50 shrink-0"
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-[#121c2a] truncate">
                                  {program.title}
                                </h4>
                                <p className="text-xs text-[#566771] line-clamp-1 max-w-sm mt-0.5">
                                  {program.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[#d3e5f1] text-[#006191]">
                              {program.category}
                            </span>
                            {program.tag && (
                              <span className="inline-block ml-1.5 text-[11px] font-medium text-[#566771]">
                                • {program.tag}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs text-[#3f4850]">
                            <p className="font-semibold text-[#121c2a]">
                              {program.dateOrSchedule}
                            </p>
                            <p className="text-[#566771] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#006191]" />
                              {program.location}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-[#3f4850] whitespace-nowrap">
                            {program.participantsCount || 'N/A'}
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProgram(program)}
                                className="p-1.5 text-[#006191] hover:bg-[#eff3ff] rounded-md transition-colors cursor-pointer"
                                title="Edit Program"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteProgram(program.id, program.title)
                                }
                                className="p-1.5 text-[#ba1a1a] hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Delete Program"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: CONTENT & CAMPAIGNS                                              */}
      {/* ========================================================================= */}
      {activeSection === 'content' && (
        <div className="space-y-8">
          {/* Site Announcement Banner */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#bec7d2]/60 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#006191]" />
                <h3 className="text-xl font-bold text-[#121c2a]">Site Announcement Banner</h3>
              </div>
              {noticeSavedAlert && (
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Changes Published Live
                </span>
              )}
            </div>

            {siteNoticeLoading ? (
              <p className="text-xs text-[#566771]">Loading site announcement settings...</p>
            ) : (
              <form onSubmit={(e) => void handleSaveNotice(e)} className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#121c2a] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.enabled}
                      onChange={(e) => updateNoticeField('enabled', e.target.checked)}
                      className="w-4 h-4 text-[#006191] rounded border-[#bec7d2]"
                    />
                    <span>Enable Notice Banner</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-[#566771] uppercase mb-1">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      name="badge"
                      value={noticeForm.badge}
                      onChange={(e) => updateNoticeField('badge', e.target.value)}
                      placeholder="e.g. URGENT RELIEF"
                      className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-[#566771] uppercase mb-1">
                      Banner Message Text
                    </label>
                    <input
                      type="text"
                      name="message"
                      value={noticeForm.message}
                      onChange={(e) => updateNoticeField('message', e.target.value)}
                      placeholder="Announcement text visible across public pages..."
                      className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#566771] uppercase mb-1">
                      CTA Link Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={noticeForm.linkText || ''}
                      onChange={(e) => updateNoticeField('linkText', e.target.value)}
                      placeholder="e.g. View Programs"
                      className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#566771] uppercase mb-1">
                      Target Screen
                    </label>
                    <select
                      value={noticeForm.linkScreen || 'programs'}
                      onChange={(e) =>
                        updateNoticeField('linkScreen', e.target.value as NavScreen)
                      }
                      className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs bg-white"
                    >
                      {NOTICE_LINK_SCREENS.map((scr) => (
                        <option key={scr} value={scr}>
                          {scr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    Save Banner Settings
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Fundraising Campaigns */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#bec7d2]/60 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#121c2a] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#006191]" />
                  <span>Featured Fundraising Campaigns ({campaigns.length})</span>
                </h3>
                <p className="text-xs text-[#566771] mt-0.5">
                  Displayed on the public Donate page with CHF targets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateCampaign}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#eff3ff] text-[#006191] hover:bg-[#d3e5f1] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Campaign
              </button>
            </div>

            {campaignsLoading ? (
              <p className="text-xs text-[#566771]">Loading campaigns...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {campaigns.map((camp) => {
                  const pct =
                    camp.goalAmount > 0
                      ? Math.round((camp.currentAmount / camp.goalAmount) * 100)
                      : 0;
                  return (
                    <div
                      key={camp.id}
                      className="p-5 bg-[#f9f9ff] rounded-xl border border-[#bec7d2]/60 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#eff3ff] text-[#006191]">
                            {camp.isCritical ? 'Critical Need' : camp.tag || 'Active Goal'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCampaign(camp)}
                              className="p-1 text-[#006191] hover:bg-white rounded cursor-pointer"
                              title="Edit Campaign"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteCampaign(camp.id, camp.title)}
                              className="p-1 text-[#ba1a1a] hover:bg-white rounded cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-[#121c2a] text-base mb-1">
                          {camp.title}
                        </h4>
                        {camp.imageUrl && (
                          <div className="w-full aspect-16/9 rounded-lg overflow-hidden mb-2.5 border border-[#bec7d2]/40 bg-gray-100">
                            <img
                              src={camp.imageUrl}
                              alt={camp.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <p className="text-xs text-[#566771] line-clamp-2 mb-4 leading-relaxed">
                          {camp.description}
                        </p>

                        <div className="space-y-1.5 mb-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>CHF {camp.currentAmount.toLocaleString()}</span>
                            <span className="text-[#566771]">
                              CHF {camp.goalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-[#e6eeff] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#006191] h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-[#566771] text-right">{pct}% Funded</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {renderDestinationsSection()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: BOARD OF DIRECTORS                                               */}
      {/* ========================================================================= */}
      {activeSection === 'board' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow">
              <div className="relative flex-grow max-w-md">
                <input
                  type="text"
                  value={boardSearchQuery}
                  onChange={(e) => setBoardSearchQuery(e.target.value)}
                  placeholder="Search board members by name, title, or bio..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-sm outline-none focus:border-[#006191]"
                />
                <Search className="w-4 h-4 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={boardFilterDept}
                onChange={(e) => setBoardFilterDept(e.target.value)}
                className="px-3 py-2.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs font-semibold text-[#121c2a] outline-none focus:border-[#006191]"
              >
                {BOARD_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateBoardMember}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#006191] text-white rounded-lg text-sm font-bold hover:bg-[#007bb6] transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Board Member</span>
            </button>
          </div>

          {boardLoading ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-[#bec7d2]/60 text-xs text-[#566771]">
              Loading Board of Directors from Firestore...
            </div>
          ) : filteredBoardMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBoardMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl border border-[#bec7d2]/60 overflow-hidden shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 w-full bg-[#eff3ff] overflow-hidden">
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded">
                          Order #{member.order || 1}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#006191] text-[10px] font-bold uppercase tracking-wider mb-1">
                          {member.department}
                        </span>
                        <h4 className="font-bold text-base leading-snug text-white">
                          {member.name}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <p className="text-xs font-bold text-[#006191] uppercase tracking-wider">
                        {member.role}
                      </p>
                      <p className="text-xs text-[#3f4850] line-clamp-3 leading-relaxed">
                        {member.bio}
                      </p>
                      {member.email && (
                        <p className="text-[11px] text-[#566771] flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-[#006191] shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-[11px] text-[#566771] font-mono">
                      ID: {member.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBoardMember(member)}
                        className="p-1.5 text-[#006191] hover:bg-[#eff3ff] rounded-md transition-colors cursor-pointer"
                        title="Edit Board Member"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBoardMember(member.id, member.name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove from Board"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#bec7d2] p-8">
              <Users className="w-12 h-12 text-[#6f7881] mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-[#121c2a]">No Board Members Found</h3>
              <p className="text-sm text-[#3f4850] mt-1 mb-5 max-w-md mx-auto">
                Add a board member using the button above to publish to the public About page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: DONATIONS & PLEDGES                                              */}
      {/* ========================================================================= */}
      {activeSection === 'donations' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
              <span className="text-xs text-[#566771] font-semibold uppercase tracking-wider">
                Total Contributions
              </span>
              <p className="text-3xl font-bold text-[#121c2a] mt-2">
                CHF {totalDonationsAmount.toLocaleString()}
              </p>
              <span className="text-xs text-emerald-700 font-medium mt-1 inline-block">
                Verified financial ledger
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
              <span className="text-xs text-[#566771] font-semibold uppercase tracking-wider">
                Total Gifts
              </span>
              <p className="text-3xl font-bold text-[#121c2a] mt-2">
                {totalTransactionsCount}
              </p>
              <span className="text-xs text-[#566771] font-medium mt-1 inline-block">
                Recorded transactions
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
              <span className="text-xs text-[#566771] font-semibold uppercase tracking-wider">
                Average Gift Size
              </span>
              <p className="text-3xl font-bold text-[#121c2a] mt-2">
                CHF {averageDonation.toLocaleString()}
              </p>
              <span className="text-xs text-[#006191] font-medium mt-1 inline-block">
                Across all destinations
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
              <span className="text-xs text-[#566771] font-semibold uppercase tracking-wider">
                Top Supported Cause
              </span>
              <p className="text-lg font-bold text-[#121c2a] mt-2 line-clamp-1">
                {destinationDistribution[0]?.[0] || 'The Verein'}
              </p>
              <span className="text-xs text-emerald-700 font-bold mt-1 inline-block">
                CHF {(destinationDistribution[0]?.[1] || 0).toLocaleString()} allocated
              </span>
            </div>
          </div>

          {/* Pending Donation Pledges Queue */}
          <div className="bg-white p-6 rounded-2xl border border-[#bec7d2]/60 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6eeff] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#121c2a]">
                  {t.admin.pendingPledgesTitle} ({fsPledges.length})
                </h3>
                <p className="text-xs text-[#566771]">
                  Verify incoming donor pledges and atomically promote them to the verified{' '}
                  <code className="font-mono">/donationReports</code> ledger.
                </p>
              </div>

              <select
                value={pledgeStatusFilter}
                onChange={(e) =>
                  setPledgeStatusFilter(
                    e.target.value as 'Processing' | 'Promoted' | 'Rejected' | 'All'
                  )
                }
                className="px-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs font-semibold"
              >
                <option value="Processing">{t.admin.pledgeStatusProcessing}</option>
                <option value="Promoted">{t.admin.pledgeStatusPromoted}</option>
                <option value="Rejected">{t.admin.pledgeStatusRejected}</option>
                <option value="All">All Pledges</option>
              </select>
            </div>

            {pledgesLoading ? (
              <p className="text-xs text-[#566771]">Loading donation pledges...</p>
            ) : fsPledges.length === 0 ? (
              <p className="text-xs text-[#566771] py-4 text-center">
                No pledges matching the selected status.
              </p>
            ) : (
              <div className="space-y-3">
                {fsPledges.map((pledge) => {
                  const isBusy = busyPledgeId === pledge.id;
                  return (
                    <div
                      key={pledge.id}
                      className="p-4 rounded-xl bg-[#f9f9ff] border border-[#bec7d2]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#006191]">
                            {pledge.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              pledge.status === 'Promoted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pledge.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {pledge.status === 'Promoted'
                              ? t.admin.pledgeStatusPromoted
                              : pledge.status === 'Rejected'
                              ? t.admin.pledgeStatusRejected
                              : t.admin.pledgeStatusProcessing}
                          </span>
                          {pledge.promotedReportId && (
                            <span className="font-mono text-[11px] text-emerald-700">
                              → {pledge.promotedReportId}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-[#121c2a]">
                          {pledge.donorName} ({pledge.email}) —{' '}
                          <span className="text-[#006191]">
                            CHF {pledge.amount.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-[#566771]">
                          {pledge.destination} • {pledge.paymentMethod} • {pledge.date}
                        </p>
                        {pledge.notes && (
                          <p className="text-[#3f4850] italic">{pledge.notes}</p>
                        )}
                      </div>

                      {pledge.status !== 'Promoted' && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handlePromotePledge(pledge)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? 'Promoting...' : t.admin.promotePledge}
                          </button>
                          {pledge.status === 'Processing' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleRejectPledge(pledge)}
                              className="px-3 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              {t.admin.rejectPledge}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribution Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-[#bec7d2]/60 shadow-2xs">
            <h3 className="text-base font-bold text-[#121c2a] mb-4 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#006191]" />
              <span>Fund Distribution By Destination</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {destinationDistribution.map(([destName, amount]) => {
                const pct =
                  totalDonationsAmount > 0
                    ? Math.round((amount / totalDonationsAmount) * 100)
                    : 0;
                return (
                  <div
                    key={destName}
                    className="p-3.5 bg-[#f9f9ff] rounded-xl border border-[#e6eeff]"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <p className="text-xs font-bold text-[#121c2a] line-clamp-1">
                        {destName}
                      </p>
                      <span className="text-xs font-extrabold text-[#006191]">
                        CHF {amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-[#e6eeff] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#006191] h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#566771] mt-1 block">
                      {pct}% of total donations
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ledger Filters & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#bec7d2]/60">
            <div className="flex flex-col sm:flex-row gap-3 flex-grow">
              <div className="relative flex-grow max-w-xs">
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Search by donor, ID, or email..."
                  className="w-full pl-9 pr-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                />
                <Search className="w-3.5 h-3.5 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={reportFilterDestination}
                onChange={(e) => setReportFilterDestination(e.target.value)}
                className="px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs font-semibold text-[#121c2a] outline-none cursor-pointer"
              >
                <option value="All">All Destinations</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsManualDonationModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#bec7d2] text-[#121c2a] hover:bg-[#eff3ff] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#006191]" />
                <span>Record Offline Donation</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#006191] text-white hover:bg-[#007bb6] text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Verified Donations Ledger */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 overflow-hidden shadow-2xs">
            {reportsLoading ? (
              <div className="p-8 text-center text-xs text-[#566771]">
                Loading verified donation reports...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eff3ff] text-xs font-bold text-[#121c2a] uppercase tracking-wider border-b border-[#bec7d2]/60">
                      <th className="py-3 px-4">Ref ID</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Donor Name &amp; Contact</th>
                      <th className="py-3 px-4">Designated Destination</th>
                      <th className="py-3 px-4">Amount (CHF)</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6eeff] text-xs">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-[#f9f9ff] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#006191]">
                          {report.id}
                        </td>
                        <td className="py-3.5 px-4 text-[#566771] whitespace-nowrap">
                          {report.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#121c2a]">{report.donorName}</p>
                          <p className="text-[11px] text-[#566771]">{report.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[#121c2a] line-clamp-1">
                            {report.destination}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#121c2a] text-sm whitespace-nowrap">
                          CHF {report.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-[#566771] whitespace-nowrap">
                          {report.paymentMethod}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {renderDestinationsSection()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PROGRAM                                                 */}
      {/* ========================================================================= */}
      {(isCreatingProgram || editingProgram) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-6">
              <h3 className="text-xl font-bold text-[#121c2a]">
                {editingProgram ? 'Edit Program Listing' : 'Create New Program Listing'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProgram(false);
                  setEditingProgram(null);
                }}
                className="p-1 rounded-full text-[#566771] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveProgram(e)} className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label
                  htmlFor="admin-program-title"
                  className="block text-xs font-bold text-[#121c2a] uppercase mb-1"
                >
                  Program Title *
                </label>
                <input
                  id="admin-program-title"
                  name="title"
                  type="text"
                  required
                  value={programForm.title || ''}
                  onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-sm font-semibold outline-none focus:border-[#006191]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={programForm.category || 'Religious'}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        category: e.target.value as Program['category']
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs font-medium bg-white"
                  >
                    <option value="Religious">Religious</option>
                    <option value="Social Impact">Social Impact</option>
                    <option value="Youth">Youth</option>
                    <option value="Health">Health</option>
                    <option value="Transparency">Transparency</option>
                    <option value="Community">Community</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Tag Label
                  </label>
                  <input
                    type="text"
                    value={programForm.tag || ''}
                    onChange={(e) => setProgramForm({ ...programForm, tag: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Schedule / Date
                  </label>
                  <input
                    type="text"
                    value={programForm.dateOrSchedule || ''}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, dateOrSchedule: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={programForm.location || ''}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, location: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Expected Attendance / Participants Count
                </label>
                <input
                  type="text"
                  value={programForm.participantsCount || ''}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, participantsCount: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <PhotoUpload
                  id="program-photo-upload"
                  value={programForm.imageUrl || ''}
                  onChange={(newUrl) => setProgramForm({ ...programForm, imageUrl: newUrl })}
                  label="Program Photo / Flyer"
                  sublabel="Upload a raster image under 500 KB or enter an HTTP(S) URL below"
                  aspectRatio="video"
                  presets={PRESET_PROGRAM_IMAGES}
                  allowUrlInput={false}
                />
                <div>
                  <label className="block text-[11px] font-bold text-[#566771] uppercase mb-1">
                    Or Image URL (HTTP/HTTPS)
                  </label>
                  <input
                    type="url"
                    value={
                      programForm.imageUrl?.startsWith('data:')
                        ? ''
                        : programForm.imageUrl || ''
                    }
                    onChange={(e) =>
                      setProgramForm({ ...programForm, imageUrl: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={programForm.description || ''}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Detailed Overview
                </label>
                <textarea
                  rows={3}
                  value={programForm.detailedOverview || ''}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, detailedOverview: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingProgram(false);
                    setEditingProgram(null);
                  }}
                  className="px-4 py-2 border border-[#bec7d2] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  {editingProgram ? 'Save Changes' : 'Publish Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CAMPAIGN                                                */}
      {/* ========================================================================= */}
      {(isCreatingCampaign || editingCampaign) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-4">
              <h3 className="text-lg font-bold text-[#121c2a]">
                {editingCampaign ? 'Edit Fundraising Campaign' : 'Create Campaign'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCampaign(false);
                  setEditingCampaign(null);
                }}
                className="p-1 text-[#566771] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveCampaign(e)} className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label
                  htmlFor="admin-campaign-title"
                  className="block text-xs font-bold text-[#121c2a] uppercase mb-1"
                >
                  Campaign Title *
                </label>
                <input
                  id="admin-campaign-title"
                  name="title"
                  type="text"
                  required
                  value={campaignForm.title || ''}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={campaignForm.description || ''}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="space-y-2">
                <PhotoUpload
                  id="campaign-photo-upload"
                  value={campaignForm.imageUrl || ''}
                  onChange={(newUrl) =>
                    setCampaignForm({ ...campaignForm, imageUrl: newUrl })
                  }
                  label="Campaign Cover Photo"
                  sublabel="Upload a raster image under 500 KB or paste an HTTP(S) URL below"
                  aspectRatio="wide"
                  presets={PRESET_PROGRAM_IMAGES.slice(0, 3)}
                  allowUrlInput={false}
                />
                <div>
                  <label className="block text-[11px] font-bold text-[#566771] uppercase mb-1">
                    Or Cover Image URL (HTTP/HTTPS)
                  </label>
                  <input
                    type="url"
                    value={
                      campaignForm.imageUrl?.startsWith('data:')
                        ? ''
                        : campaignForm.imageUrl || ''
                    }
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, imageUrl: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Current Raised (CHF)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={campaignForm.currentAmount ?? 0}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        currentAmount: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Target Goal (CHF)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={campaignForm.goalAmount ?? 10000}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        goalAmount: parseFloat(e.target.value) || 10000
                      })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="crit-checkbox"
                  checked={campaignForm.isCritical || false}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, isCritical: e.target.checked })
                  }
                  className="w-4 h-4 text-[#006191] rounded border-[#bec7d2]"
                />
                <label
                  htmlFor="crit-checkbox"
                  className="text-xs font-semibold text-[#121c2a] cursor-pointer"
                >
                  Mark as Critical Urgent Need
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCampaign(false);
                    setEditingCampaign(null);
                  }}
                  className="px-4 py-2 border border-[#bec7d2] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CONTRIBUTION DESTINATION                                       */}
      {/* ========================================================================= */}
      {isCreatingDestination && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-4">
              <h3 className="text-lg font-bold text-[#121c2a]">
                Add Contribution Destination
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingDestination(false)}
                className="p-1 text-[#566771] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveDestination(e)} className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Destination Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Nothilfe Sumatra"
                  value={destinationForm.name || ''}
                  onChange={(e) =>
                    setDestinationForm({ ...destinationForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={destinationForm.category || ''}
                  onChange={(e) =>
                    setDestinationForm({ ...destinationForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Allocation Description
                </label>
                <textarea
                  rows={3}
                  value={destinationForm.description || ''}
                  onChange={(e) =>
                    setDestinationForm({
                      ...destinationForm,
                      description: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => setIsCreatingDestination(false)}
                  className="px-4 py-2 border border-[#bec7d2] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  Add Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD MANUAL OFFLINE DONATION (CHF)                               */}
      {/* ========================================================================= */}
      {isManualDonationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-4">
              <h3 className="text-lg font-bold text-[#121c2a]">Record Offline Donation</h3>
              <button
                type="button"
                onClick={() => setIsManualDonationModalOpen(false)}
                className="p-1 text-[#566771] hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveManualDonation(e)} className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Donor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualDonation.donorName}
                  onChange={(e) =>
                    setManualDonation({ ...manualDonation, donorName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Donor Email
                </label>
                <input
                  type="email"
                  value={manualDonation.email}
                  onChange={(e) =>
                    setManualDonation({ ...manualDonation, email: e.target.value })
                  }
                  placeholder="donor@example.com"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Amount (CHF) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100000}
                    value={manualDonation.amount}
                    onChange={(e) =>
                      setManualDonation({
                        ...manualDonation,
                        amount: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={manualDonation.paymentMethod}
                    onChange={(e) =>
                      setManualDonation({
                        ...manualDonation,
                        paymentMethod: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs bg-white"
                  >
                    <option value="Cash / Secretariat Office">Cash / Secretariat</option>
                    <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                    <option value="TWINT">TWINT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Designated Destination
                </label>
                <select
                  value={manualDonation.destination}
                  onChange={(e) =>
                    setManualDonation({ ...manualDonation, destination: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-medium bg-white"
                >
                  {destinations.length > 0 ? (
                    destinations.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))
                  ) : (
                    <option value="The Verein itself (Percikan Iman)">
                      The Verein itself (Percikan Iman)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Internal Notes
                </label>
                <input
                  type="text"
                  value={manualDonation.notes}
                  onChange={(e) =>
                    setManualDonation({ ...manualDonation, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => setIsManualDonationModalOpen(false)}
                  className="px-4 py-2 border border-[#bec7d2] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  Record in Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BOARD MEMBER                                            */}
      {/* ========================================================================= */}
      {(isCreatingBoardMember || editingBoardMember) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#121c2a]">
                  {editingBoardMember
                    ? 'Edit Board Member Profile'
                    : 'Add New Board Member'}
                </h3>
                <p className="text-xs text-[#3f4850] mt-0.5">
                  Profiles saved here are published to the public About page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingBoardMember(false);
                  setEditingBoardMember(null);
                }}
                className="p-1 rounded-full text-[#566771] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveBoardMember(e)} className="space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Full Name &amp; Titles *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  value={boardMemberForm.name || ''}
                  onChange={(e) =>
                    setBoardMemberForm({ ...boardMemberForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Role / Title *
                  </label>
                  <input
                    name="role"
                    type="text"
                    required
                    value={boardMemberForm.role || ''}
                    onChange={(e) =>
                      setBoardMemberForm({ ...boardMemberForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Department / Committee
                  </label>
                  <select
                    value={boardMemberForm.department || 'Executive Leadership'}
                    onChange={(e) =>
                      setBoardMemberForm({
                        ...boardMemberForm,
                        department: e.target.value
                      })
                    }
                    className="w-full px-3 py-2.5 border border-[#bec7d2] rounded-lg text-xs font-medium bg-white"
                  >
                    {BOARD_DEPARTMENTS.filter((d) => d !== 'All Departments').map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <PhotoUpload
                  id="board-member-photo-upload"
                  value={boardMemberForm.imageUrl || ''}
                  onChange={(newUrl) =>
                    setBoardMemberForm({ ...boardMemberForm, imageUrl: newUrl })
                  }
                  label="Board Member Photo / Headshot"
                  sublabel="Upload a raster image under 500 KB or paste an HTTP(S) URL below"
                  aspectRatio="avatar"
                  presets={PRESET_BOARD_AVATARS}
                  allowUrlInput={false}
                />
                <div>
                  <label className="block text-[11px] font-bold text-[#566771] uppercase mb-1">
                    Or Headshot URL (HTTP/HTTPS)
                  </label>
                  <input
                    type="url"
                    value={
                      boardMemberForm.imageUrl?.startsWith('data:')
                        ? ''
                        : boardMemberForm.imageUrl || ''
                    }
                    onChange={(e) =>
                      setBoardMemberForm({ ...boardMemberForm, imageUrl: e.target.value })
                    }
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Biography / Professional Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  value={boardMemberForm.bio || ''}
                  onChange={(e) =>
                    setBoardMemberForm({ ...boardMemberForm, bio: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Official Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={boardMemberForm.email || ''}
                    onChange={(e) =>
                      setBoardMemberForm({ ...boardMemberForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Display Order Priority
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={boardMemberForm.order || 1}
                    onChange={(e) =>
                      setBoardMemberForm({
                        ...boardMemberForm,
                        order: parseInt(e.target.value, 10) || 1
                      })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingBoardMember(false);
                    setEditingBoardMember(null);
                  }}
                  className="px-4 py-2 border border-[#bec7d2] text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {editingBoardMember ? 'Save Changes' : 'Publish Board Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
