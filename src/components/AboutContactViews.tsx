import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Search,
  Scale,
  BookOpen,
  Building2,
  Landmark,
  Users,
  FileCheck2,
  HeartHandshake,
  Lock,
  KeyRound,
  Instagram,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { BoardMember } from '../types';
import {
  BOARD_DEPARTMENTS,
  SWISS_VEREIN_LEGAL_INFO,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL
} from '../constants';
import { useAuth } from '../context/AuthContext';
import { subscribeBoardMembers } from '../lib/firestoreContent';
import { useLanguage } from '../i18n';
import { RollingTextButton } from './RollingTextButton';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger, Flip, useGSAP);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getObjectPositionClass(position?: BoardMember['imagePosition']): string {
  switch (position) {
    case 'center':
      return 'object-center';
    case 'bottom':
      return 'object-bottom';
    case 'top':
    default:
      return 'object-top';
  }
}

function getMemberInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'PI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AboutViewProps {
  onOpenStatuten?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onOpenStatuten }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const boardGridRef = useRef<HTMLDivElement>(null);
  const boardFlipStateRef = useRef<Flip.FlipState | null>(null);

  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [selectedDept, setSelectedDept] = useState<string>('All Departments');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeBoardMembers((res) => {
      setBoardMembers(res.data);
      setBoardLoading(res.loading);
      setBoardError(res.error);
    });
    return () => unsub();
  }, []);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)'
        },
        (context) => {
          const { motionOk, reduceMotion } = context.conditions ?? {};
          if (!motionOk || reduceMotion) return;

          const heroItems = gsap.utils.toArray<HTMLElement>('[data-gsap="about-hero"]');
          if (heroItems.length > 0) {
            gsap.from(heroItems, {
              y: 18,
              opacity: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
          }

          const cards = gsap.utils.toArray<HTMLElement>('[data-gsap="about-card"]');
          cards.forEach((card) => {
            gsap.from(card, {
              y: 20,
              opacity: 0,
              duration: 0.6,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: card,
                start: 'top 92%',
                once: true
              }
            });
          });
        }
      );
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  const hasBoardMembers = !boardLoading && boardMembers.length > 0;

  useGSAP(
    () => {
      if (
        !hasBoardMembers ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      ) {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)'
        },
        (context) => {
          const { motionOk, reduceMotion } = context.conditions ?? {};
          if (!motionOk || reduceMotion) return;

          const boardCards = gsap.utils.toArray<HTMLElement>('[data-gsap="board-card"]');
          if (boardCards.length > 0) {
            gsap.from(boardCards, {
              y: 22,
              opacity: 0,
              duration: 0.6,
              stagger: 0.07,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: '#board-section',
                start: 'top 88%',
                once: true
              }
            });
            ScrollTrigger.refresh();
          }
        }
      );
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [hasBoardMembers] }
  );

  const filteredMembers = useMemo(() => {
    return boardMembers.filter((member) => {
      const matchDept =
        selectedDept === 'All Departments' ||
        member.department.toLowerCase() === selectedDept.toLowerCase();
      const matchSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.bio.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [boardMembers, selectedDept, searchQuery]);

  const captureBoardFlipState = () => {
    if (prefersReducedMotion() || !boardGridRef.current) return;
    const cards = boardGridRef.current.querySelectorAll('[data-about-board-card]');
    if (cards.length === 0) return;
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger && (st.trigger as Element).id === 'board-section') {
        st.animation?.progress(1);
        st.kill();
      }
    });
    gsap.set(cards, { opacity: 1 });
    boardFlipStateRef.current = Flip.getState(cards);
  };

  const handleSelectDept = (dept: string) => {
    if (dept === selectedDept) return;
    captureBoardFlipState();
    setSelectedDept(dept);
  };

  const handleSearchChange = (value: string) => {
    captureBoardFlipState();
    setSearchQuery(value);
  };

  useGSAP(
    () => {
      const state = boardFlipStateRef.current;
      boardFlipStateRef.current = null;
      if (!state || !boardGridRef.current || prefersReducedMotion()) return;

      const targets = boardGridRef.current.querySelectorAll('[data-about-board-card]');
      if (targets.length === 0) return;
      Flip.from(state, {
        targets,
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.035,
        absolute: true,
        nested: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { opacity: 0, scale: 0.94, y: 12 },
            { opacity: 1, scale: 1, y: 0, duration: 0.35, clearProps: 'transform,opacity' }
          ),
        onLeave: (els) =>
          gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.25 })
      });
    },
    { scope: boardGridRef, dependencies: [selectedDept, searchQuery, filteredMembers] }
  );

  return (
    <div ref={rootRef} className="w-full py-12">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Banner */}
        <div
          data-gsap="about-hero"
          className="bg-white rounded-2xl p-8 md:p-12 mb-12 border border-[#DCE2DF]"
        >
          <span className="inline-block px-3 py-1 bg-[#E6F0F5] text-[#005A87] text-xs font-semibold rounded mb-3 border border-[#005A87]/20">
            {t.about.since1998}
          </span>
          <h1 className="display-hero font-semibold text-[#0F1D26] mb-4">
            {t.about.title}
          </h1>
          <p className="text-base md:text-lg text-[#4A5862] max-w-[65ch] leading-relaxed">
            {t.about.description}
          </p>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          <div
            data-gsap="about-hero"
            className="p-8 bg-white rounded-xl border border-[#DCE2DF] program-card-shadow"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-3">{t.about.visionTitle}</h2>
            <p className="text-sm md:text-base text-[#4A5862] leading-relaxed">
              {t.about.visionDesc}
            </p>
          </div>
          <div
            data-gsap="about-hero"
            className="p-8 bg-white rounded-xl border border-[#DCE2DF] program-card-shadow"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-3">{t.about.missionTitle}</h2>
            <ul className="text-sm md:text-base text-[#4A5862] space-y-2.5 list-disc list-inside leading-relaxed">
              <li>{t.about.mission1}</li>
              <li>{t.about.mission2}</li>
              <li>{t.about.mission3}</li>
            </ul>
          </div>
        </div>

        {/* Swiss Legality & Official German Statutes Section */}
        <section id="swiss-legality-section" data-gsap="about-card" className="mb-16">
          <div className="bg-white rounded-2xl border border-[#DCE2DF] p-8 md:p-10 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded">
                    <span className="font-mono text-sm leading-none" aria-hidden="true">+</span> Schweiz / Switzerland
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F0F5] text-[#005A87] text-xs font-semibold rounded border border-[#005A87]/20">
                    <Scale className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Art. 60–79 ZGB</span>
                  </span>
                  <span className="text-xs font-mono text-[#0F1D26] bg-[#F6F7F4] px-2.5 py-1 rounded border border-[#DCE2DF]">
                    UID: {SWISS_VEREIN_LEGAL_INFO.uidChe || 'CHE-382.914.820'}
                  </span>
                </div>

                <div>
                  <h2 className="display-section font-semibold text-[#0F1D26] flex items-center gap-2.5">
                    <Building2 className="w-6 h-6 text-[#005A87] shrink-0" aria-hidden="true" />
                    <span>{t.about.swissLegalityTitle}</span>
                  </h2>
                  <p className="text-base text-[#4A5862] mt-2 leading-relaxed max-w-[65ch]">
                    {t.about.swissLegalityDesc}
                  </p>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-[#F6F7F4] rounded-xl border border-[#DCE2DF]">
                    <dt className="text-xs font-semibold text-[#4A5862]">Rechtssitz</dt>
                    <dd className="text-sm font-bold text-[#0F1D26] mt-0.5">{SWISS_VEREIN_LEGAL_INFO.seatCity}, Schweiz</dd>
                    <span className="text-[11px] text-[#4A5862] block mt-0.5">Kanton Zürich</span>
                  </div>
                  <div className="p-4 bg-[#F6F7F4] rounded-xl border border-[#DCE2DF]">
                    <dt className="text-xs font-semibold text-[#4A5862]">Haftung (Art. 75a ZGB)</dt>
                    <dd className="text-sm font-bold text-[#0D6E52] mt-0.5">Nur Vereinsvermögen</dd>
                    <span className="text-[11px] text-[#4A5862] block mt-0.5">Keine persönliche Haftung</span>
                  </div>
                  <div className="p-4 bg-[#F6F7F4] rounded-xl border border-[#DCE2DF]">
                    <dt className="text-xs font-semibold text-[#4A5862]">Amtssprache</dt>
                    <dd className="text-sm font-bold text-[#0F1D26] mt-0.5">Deutsch</dd>
                    <span className="text-[11px] text-[#4A5862] block mt-0.5">Offizielle Statuten</span>
                  </div>
                </dl>
              </div>

              {onOpenStatuten && (
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
                  <RollingTextButton
                    type="button"
                    onClick={onOpenStatuten}
                    leftIcon={<BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    label={t.about.viewStatutesBtn}
                    className="min-h-12 px-6 py-3.5 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                  />
                  <span className="text-[11px] text-center text-[#4A5862]">
                    Vollständiger Wortlaut (12 Artikel) • 23. Feb 2025
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Audited Financial Report & Vereinsversammlung Governance - MEMBER RESTRICTED */}
        <section id="financial-governance-section" data-gsap="about-card" className="mb-16">
          {currentUser ? (
            <div className="bg-white rounded-2xl border border-[#DCE2DF] p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#EEF2F0]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E7F3EE] text-[#0D6E52] text-xs font-semibold rounded border border-[#0D6E52]/20">
                      <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Jahresrechnung &amp; Revisorenurteil</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#E6F0F5] text-[#005A87] text-[11px] font-semibold rounded">
                      <Users className="w-3 h-3" aria-hidden="true" />
                      <span>Mitglied: {currentUser.name} ({currentUser.memberCode})</span>
                    </span>
                  </div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#0F1D26]">
                    Finanzielle Transparenz &amp; Vereinsbericht
                  </h2>
                  <p className="text-sm text-[#4A5862] mt-1">
                    Genehmigt an der ordentlichen Vereinsversammlung gemäss Art. 8 &amp; 10 der Statuten.
                  </p>
                </div>
                <div className="bg-[#F6F7F4] px-4 py-3 rounded-lg border border-[#DCE2DF] text-xs text-[#0F1D26] font-mono flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#005A87]" aria-hidden="true" />
                  <span>PostFinance: CH89 0900 0000 6049 6610 7</span>
                </div>
              </div>

              {/* Key Financial KPIs */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6 tabular-nums">
                <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#DCE2DF]">
                  <dt className="text-xs font-semibold text-[#4A5862]">Total Aktiven (31.12.2025)</dt>
                  <dd className="font-editorial text-2xl font-semibold text-[#0F1D26] mt-1">CHF 45&apos;912.78</dd>
                  <div className="text-[11px] text-[#005A87] mt-1 font-medium">PostFinance CHF 45&apos;007.87</div>
                </div>
                <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#DCE2DF]">
                  <dt className="text-xs font-semibold text-[#4A5862]">Einnahmen 2025</dt>
                  <dd className="font-editorial text-2xl font-semibold text-[#0D6E52] mt-1">CHF 22&apos;056.80</dd>
                  <div className="text-[11px] text-[#4A5862] mt-1">Beiträge, INFAQ &amp; Camp</div>
                </div>
                <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#DCE2DF]">
                  <dt className="text-xs font-semibold text-[#4A5862]">Ergebnis 2025 (Gewinn)</dt>
                  <dd className="font-editorial text-2xl font-semibold text-[#005A87] mt-1">+CHF 3&apos;136.82</dd>
                  <div className="text-[11px] text-[#4A5862] mt-1">Ausgaben: CHF 18&apos;919.98</div>
                </div>
                <div className="p-4 rounded-xl bg-[#F6F7F4] border border-[#DCE2DF]">
                  <dt className="text-xs font-semibold text-[#4A5862]">Mitgliederbestand</dt>
                  <dd className="font-editorial text-2xl font-semibold text-[#0F1D26] mt-1">126 Einheiten</dd>
                  <div className="text-[11px] text-[#0D6E52] mt-1 font-medium">77 Familien + 49 Einzelne</div>
                </div>
              </dl>

              {/* Auditors statement and humanitarian allocations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#EEF2F0]">
                <div className="p-5 rounded-xl bg-[#F6F7F4] border border-[#DCE2DF] space-y-2">
                  <div className="flex items-center gap-2 text-[#0F1D26] font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0D6E52]" aria-hidden="true" />
                    <span>Prüfbericht der Revisionsstelle (Art. 10 Statuten)</span>
                  </div>
                  <p className="text-xs text-[#4A5862] leading-relaxed">
                    Die gewählten Revisoren <strong>Oky Tedjasukmana</strong> und <strong>Ahsan Sarwar</strong> haben die Buchführung und Bankkonten des VPI für 2025 lückenlos geprüft. Die Rechnungsführung entspricht Gesetz und Statuten. Der Vereinsversammlung wurde die <strong>uneingeschränkte Décharge (Entlastung)</strong> des Vorstands empfohlen und erteilt.
                  </p>
                  <div className="text-[11px] font-semibold text-[#0D6E52] bg-[#E7F3EE] px-2.5 py-1 rounded inline-block">
                    Status: Einstimmig genehmigt &amp; entlastet
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white border border-[#DCE2DF] space-y-2 tabular-nums">
                  <div className="flex items-center gap-2 text-[#0F1D26] font-bold text-xs">
                    <HeartHandshake className="w-4 h-4 text-[#005A87]" aria-hidden="true" />
                    <span>Geleistete Hilfsgelder &amp; Aktionen (2025)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#4A5862]">
                    <div className="p-2.5 bg-[#F6F7F4] rounded-lg">
                      <span className="text-[11px] text-[#4A5862] block">Zakat (Fitrah, Maal, Fidyah)</span>
                      <strong className="text-sm font-bold text-[#0F1D26]">CHF 5&apos;370</strong>
                    </div>
                    <div className="p-2.5 bg-[#F6F7F4] rounded-lg">
                      <span className="text-[11px] text-[#4A5862] block">Qurban (15 Schafe)</span>
                      <strong className="text-sm font-bold text-[#0F1D26]">CHF 2&apos;775</strong>
                    </div>
                    <div className="p-2.5 bg-[#F6F7F4] rounded-lg">
                      <span className="text-[11px] text-[#4A5862] block">Ramadan Iftar Boxen</span>
                      <strong className="text-sm font-bold text-[#0F1D26]">795 Mahlzeiten</strong>
                    </div>
                    <div className="p-2.5 bg-[#F6F7F4] rounded-lg">
                      <span className="text-[11px] text-[#4A5862] block">Trauerspenden (Art. 6015)</span>
                      <strong className="text-sm font-bold text-[#0F1D26]">CHF 600</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Member Gate */
            <div className="bg-white rounded-2xl border border-[#DCE2DF] p-8 sm:p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#E6F0F5] text-[#005A87] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 text-xs font-semibold rounded mb-2 border border-amber-200">
                <Scale className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                <span>Nur für Vereinsmitglieder (Art. 8 &amp; 10 ZGB)</span>
              </span>
              <h2 className="font-editorial text-2xl font-semibold text-[#0F1D26] mt-1">
                Jahresrechnung &amp; Revisionsbericht
              </h2>
              <p className="text-sm text-[#4A5862] max-w-[58ch] mx-auto mt-2 leading-relaxed">
                Gemäss den Statuten des Vereins Percikan Iman Schweiz (Art. 8 Rechte der Mitglieder &amp; Art. 10 Revisionsstelle) sind die detaillierten Finanzberichte, Bilanzaufstellungen und der Prüfbericht der Revisoren ausschliesslich registrierten Vereinsmitgliedern zugänglich.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <RollingTextButton
                  type="button"
                  onClick={() => navigate('/login')}
                  leftIcon={<KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  label="Als Mitglied anmelden"
                  className="min-h-11 px-5 py-2.5 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                />
                {onOpenStatuten && (
                  <RollingTextButton
                    type="button"
                    magnetic={false}
                    onClick={onOpenStatuten}
                    leftIcon={<BookOpen className="w-4 h-4 text-[#005A87] shrink-0" aria-hidden="true" />}
                    label="Vereinsstatuten einsehen"
                    className="min-h-11 px-4 py-2.5 bg-[#F6F7F4] hover:bg-[#EEF2F0] text-[#0F1D26] rounded-lg text-xs font-semibold transition-colors border border-[#DCE2DF] flex items-center gap-1.5 cursor-pointer"
                  />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Board & Leadership Section */}
        <section id="board-section" className="mb-16 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 pb-4 border-b border-[#DCE2DF]">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F0F5] text-[#005A87] text-xs font-semibold rounded mb-2">
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.about.leadershipCouncil}</span>
              </span>
              <h2 className="display-section font-semibold text-[#0F1D26]">
                {t.about.boardTitle}
              </h2>
              <p className="text-sm md:text-base text-[#4A5862] mt-1 max-w-[60ch] leading-relaxed">
                {t.about.boardSubtitle}
              </p>
            </div>
          </div>

          {boardError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{boardError}</span>
            </div>
          )}

          {/* Controls: Department Filter and Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full" role="group" aria-label="Filter board by department">
              {BOARD_DEPARTMENTS.map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectDept(dept)}
                    className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0F1D26] text-white border-[#0F1D26]'
                        : 'bg-white text-[#4A5862] border-[#DCE2DF] hover:border-[#005A87]'
                    }`}
                  >
                    {dept === 'All Departments' ? t.about.allDepartments : dept}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[240px]">
              <label htmlFor="board-search-input" className="visually-hidden">
                {t.about.searchBoardPlaceholder}
              </label>
              <input
                id="board-search-input"
                type="search"
                placeholder={t.about.searchBoardPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#DCE2DF] rounded-lg text-xs outline-none focus:border-[#005A87]"
              />
              <Search className="w-4 h-4 text-[#4A5862] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          {/* Board Members Grid */}
          {boardLoading ? (
            <div aria-busy="true" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="bg-white rounded-xl border border-[#DCE2DF] h-96 p-5" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div
              ref={boardGridRef}
              className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredMembers.map((member) => {
                const imgKey = `${member.id}:${member.imageUrl || ''}`;
                const showFallback = !member.imageUrl || Boolean(failedImages[imgKey]);
                const objectPositionClass = getObjectPositionClass(member.imagePosition);
                return (
                  <article
                    key={member.id}
                    data-gsap="board-card"
                    data-about-board-card
                    data-flip-id={member.id}
                    className="bg-white rounded-xl border border-[#DCE2DF] overflow-hidden program-card-shadow flex flex-col group"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#EEF2F0]">
                      {showFallback ? (
                        <div
                          role="img"
                          aria-label={member.name}
                          className="w-full h-full bg-gradient-to-br from-[#0F1D26] via-[#0B3954] to-[#005A87] flex items-center justify-center pb-12"
                        >
                          <div className="w-20 h-20 rounded-full bg-white/12 border border-white/25 backdrop-blur-xs flex items-center justify-center shadow-inner">
                            <span className="font-editorial text-2xl font-semibold text-white tracking-wider">
                              {getMemberInitials(member.name)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={() =>
                            setFailedImages((prev) =>
                              prev[imgKey] ? prev : { ...prev, [imgKey]: true }
                            )
                          }
                          className={`w-full h-full object-cover ${objectPositionClass} group-hover:scale-103 transition-transform duration-500`}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1D26]/85 via-[#0F1D26]/20 to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#005A87] text-[11px] font-semibold text-white mb-1">
                          {member.department}
                        </span>
                        <h3 className="font-editorial text-xl font-semibold text-white leading-snug">
                          {member.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#005A87] mb-2">
                          {member.role}
                        </p>
                        <p className="text-xs md:text-sm text-[#4A5862] leading-relaxed mb-4">
                          {member.bio}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#EEF2F0] flex items-center justify-between">
                        {member.email ? (
                          <a
                            href={`mailto:${member.email}`}
                            className="inline-flex items-center gap-1.5 text-xs text-[#005A87] hover:underline font-medium"
                          >
                            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="truncate max-w-[180px]">{member.email}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-[#4A5862]">Vorstand VPI</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-[#DCE2DF] p-8">
              <UserCheck className="w-10 h-10 text-[#4A5862] mx-auto mb-2" aria-hidden="true" />
              <p className="font-editorial text-lg font-semibold text-[#0F1D26]">{t.about.noBoardFound}</p>
              <p className="text-xs text-[#4A5862] mt-1 mb-4">
                {t.about.adjustSearch}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const ContactView: React.FC = () => {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)'
        },
        (context) => {
          const { motionOk, reduceMotion } = context.conditions ?? {};
          if (!motionOk || reduceMotion) return;

          const items = gsap.utils.toArray<HTMLElement>('[data-gsap="contact-reveal"]');
          if (items.length > 0) {
            gsap.from(items, {
              y: 18,
              opacity: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
          }
        }
      );
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="w-full py-12">
      <div className="max-w-[1200px] mx-auto px-6">
        <div data-gsap="contact-reveal" className="mb-10">
          <h1 className="display-hero font-semibold text-[#0F1D26] mb-2">{t.contact.title}</h1>
          <p className="text-base text-[#4A5862] max-w-[60ch]">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Details */}
          <div data-gsap="contact-reveal" className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-[#DCE2DF] space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#E6F0F5] text-[#005A87] rounded-lg shrink-0">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0F1D26] text-sm">{t.contact.officeTitle}</h2>
                  <p className="text-xs md:text-sm text-[#4A5862] mt-1 leading-relaxed">
                    {t.contact.officeAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#E6F0F5] text-[#005A87] rounded-lg shrink-0">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0F1D26] text-sm">{t.contact.emailTitle}</h2>
                  <p className="text-xs md:text-sm text-[#4A5862] mt-1">{t.contact.emailGeneral}</p>
                  <p className="text-xs text-[#4A5862]">{t.contact.emailDonors}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#E6F0F5] text-[#005A87] rounded-lg shrink-0">
                  <Phone className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0F1D26] text-sm">{t.contact.callTitle}</h2>
                  <p className="text-xs md:text-sm text-[#4A5862] mt-1">{t.contact.phoneNumbers}</p>
                  <p className="text-xs text-[#4A5862]">{t.contact.hours}</p>
                </div>
              </div>
            </div>

            {/* Official Bank Account / Spendenkonto Card */}
            <div className="bg-white p-5 rounded-xl border border-[#DCE2DF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005A87]">
                  <Landmark className="w-4 h-4 text-[#005A87]" aria-hidden="true" />
                  <span>Bankverbindung &amp; Spendenkonto</span>
                </span>
                <span className="text-[11px] font-semibold bg-[#E6F0F5] text-[#005A87] px-2 py-0.5 rounded">
                  Schweiz (CHF)
                </span>
              </div>
              <div className="text-xs text-[#4A5862] space-y-1.5 pt-1">
                <div>
                  <span className="text-[#4A5862] block text-[11px]">Bankinstitut:</span>
                  <strong className="text-[#0F1D26]">PostFinance</strong>
                </div>
                <div>
                  <span className="text-[#4A5862] block text-[11px]">IBAN:</span>
                  <strong className="font-mono text-xs text-[#005A87] bg-[#F6F7F4] border border-[#DCE2DF] px-2.5 py-1.5 rounded block mt-0.5 tracking-wider select-all">
                    CH89 0900 0000 6049 6610 7
                  </strong>
                </div>
                <div>
                  <span className="text-[#4A5862] block text-[11px]">Kontoinhaber:</span>
                  <span className="font-semibold text-[#0F1D26]">Verein Percikan Iman, 8000 Zürich</span>
                </div>
              </div>
            </div>

            {/* Instagram Official Channel Card */}
            <div className="bg-white p-5 rounded-xl border border-[#DCE2DF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F1D26]">
                  <Instagram className="w-4 h-4 text-rose-600" aria-hidden="true" />
                  <span>Instagram Kanal</span>
                </span>
                <span className="text-[11px] font-mono text-[#4A5862]">
                  {INSTAGRAM_HANDLE}
                </span>
              </div>
              <p className="text-xs text-[#4A5862] leading-relaxed">
                Folgen Sie unserer Community auf Instagram für aktuelle Fotos, Videos der Veranstaltungen und Ankündigungen.
              </p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 min-h-9 px-3.5 py-1.5 bg-[#0F1D26] hover:bg-[#005A87] text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <span>{INSTAGRAM_HANDLE} auf Instagram öffnen</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div
            data-gsap="contact-reveal"
            className="lg:col-span-7 bg-white p-8 rounded-xl border border-[#DCE2DF]"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-1.5">{t.contact.formTitle}</h2>
            <p className="text-sm text-[#4A5862] mb-6">
              {t.contact.formSubtitle}
            </p>

            {submitted ? (
              <div role="status" className="p-8 bg-[#E7F3EE] rounded-xl text-center space-y-3 border border-[#0D6E52]/20">
                <CheckCircle2 className="w-12 h-12 text-[#0D6E52] mx-auto" aria-hidden="true" />
                <h3 className="font-editorial text-xl font-semibold text-[#0F1D26]">{t.contact.messageSentTitle}</h3>
                <p className="text-sm text-[#4A5862]">
                  {t.contact.messageSentDesc}
                </p>
                <RollingTextButton
                  type="button"
                  magnetic={false}
                  onClick={() => setSubmitted(false)}
                  label={t.contact.sendAnother}
                  className="min-h-10 px-4 py-2 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center"
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold text-[#0F1D26] mb-1.5">
                      {t.contact.yourName}
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      required
                      placeholder="Vor- und Nachname"
                      className="w-full px-3.5 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold text-[#0F1D26] mb-1.5">
                      {t.contact.yourEmail}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.ch"
                      className="w-full px-3.5 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-semibold text-[#0F1D26] mb-1.5">
                    {t.contact.subject}
                  </label>
                  <select
                    id="contact-subject"
                    className="w-full px-3.5 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none bg-white"
                  >
                    <option>{t.contact.subjectGeneral}</option>
                    <option>{t.contact.subjectPrograms}</option>
                    <option>{t.contact.subjectDonation}</option>
                    <option>{t.contact.subjectPartnership}</option>
                    <option>{t.contact.subjectVolunteer}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-[#0F1D26] mb-1.5">
                    {t.contact.message}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder={t.contact.messagePlaceholder}
                    className="w-full px-3.5 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none resize-none"
                  />
                </div>

                <RollingTextButton
                  type="submit"
                  magnetic={false}
                  leftIcon={<Send className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  label={t.contact.submitMessage}
                  className="w-full min-h-12 py-3.5 px-6 bg-[#005A87] text-white font-semibold rounded-lg hover:bg-[#004569] transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
