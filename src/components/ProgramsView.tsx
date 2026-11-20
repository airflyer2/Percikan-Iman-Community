import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Program } from '../types';
import { subscribePrograms } from '../lib/firestoreContent';
import { useLanguage } from '../i18n';
import { Calendar, MapPin, Users, CheckCircle2, Send, X, Search, AlertCircle } from 'lucide-react';
import { RollingTextButton } from './RollingTextButton';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const ProgramsView: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProgram, setActiveModalProgram] = useState<Program | null>(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState<boolean>(false);
  const [directorModalOpen, setDirectorModalOpen] = useState<boolean>(false);
  const [directorSubmitted, setDirectorSubmitted] = useState<boolean>(false);
  const regTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribePrograms((res) => {
      setPrograms(res.data);
      setLoading(res.loading);
      setLoadError(res.error);
    });
    return () => {
      unsub();
      if (regTimerRef.current) clearTimeout(regTimerRef.current);
      if (dirTimerRef.current) clearTimeout(dirTimerRef.current);
    };
  }, []);

  const categories = [
    { key: 'all', label: t.programs.allPrograms },
    { key: 'religious', label: t.programs.religious },
    { key: 'social impact', label: t.programs.socialImpact },
    { key: 'youth', label: t.programs.youth },
    { key: 'health', label: 'Health' },
    { key: 'transparency', label: 'Transparency' },
    { key: 'community', label: 'Community' }
  ];

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return programs.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const tag = (p.tag || '').toLowerCase();
      const matchesCat =
        selectedCategory === 'all' ||
        cat === selectedCategory.toLowerCase() ||
        tag === selectedCategory.toLowerCase();

      const matchesSearch =
        !q ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        cat.includes(q) ||
        (p.location || '').toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [programs, selectedCategory, searchQuery]);

  const getTagBadgeStyle = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'youth':
        return 'bg-[#E6F0F5] text-[#005A87] border border-[#005A87]/20';
      case 'social impact':
        return 'bg-[#E7F3EE] text-[#0D6E52] border border-[#0D6E52]/20';
      default:
        return 'bg-[#EEF2F0] text-[#0F1D26] border border-[#DCE2DF]';
    }
  };

  const openProgramModal = (program: Program) => {
    if (regTimerRef.current) {
      clearTimeout(regTimerRef.current);
      regTimerRef.current = null;
    }
    setRegistrationSubmitted(false);
    setActiveModalProgram(program);
  };

  const closeProgramModal = () => {
    if (regTimerRef.current) {
      clearTimeout(regTimerRef.current);
      regTimerRef.current = null;
    }
    setRegistrationSubmitted(false);
    setActiveModalProgram(null);
  };

  const closeDirectorModal = () => {
    if (dirTimerRef.current) {
      clearTimeout(dirTimerRef.current);
      dirTimerRef.current = null;
    }
    setDirectorSubmitted(false);
    setDirectorModalOpen(false);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationSubmitted(true);
    if (regTimerRef.current) clearTimeout(regTimerRef.current);
    regTimerRef.current = setTimeout(() => {
      regTimerRef.current = null;
      closeProgramModal();
    }, 2000);
  };

  const handleDirectorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDirectorSubmitted(true);
    if (dirTimerRef.current) clearTimeout(dirTimerRef.current);
    dirTimerRef.current = setTimeout(() => {
      dirTimerRef.current = null;
      closeDirectorModal();
    }, 2200);
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

          const heroItems = gsap.utils.toArray<HTMLElement>('[data-gsap="programs-hero"]');
          if (heroItems.length > 0) {
            gsap.from(heroItems, {
              y: 16,
              opacity: 0,
              duration: 0.65,
              stagger: 0.08,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
          }

          const ctaBanner = gsap.utils.toArray<HTMLElement>('[data-gsap="programs-cta"]');
          if (ctaBanner.length > 0) {
            gsap.from(ctaBanner, {
              y: 20,
              opacity: 0,
              duration: 0.65,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: ctaBanner[0],
                start: 'top 92%',
                once: true
              }
            });
          }
        }
      );
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  const hasPrograms = !loading && programs.length > 0;

  useGSAP(
    () => {
      if (
        !hasPrograms ||
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

          const cards = gsap.utils.toArray<HTMLElement>('[data-gsap="program-card"]');
          if (cards.length > 0) {
            gsap.from(cards, {
              y: 22,
              opacity: 0,
              duration: 0.6,
              stagger: 0.07,
              ease: 'power3.out',
              clearProps: 'transform,opacity'
            });
            ScrollTrigger.refresh();
          }
        }
      );
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [hasPrograms] }
  );

  return (
    <div ref={rootRef} className="w-full">
      {/* Header Banner */}
      <section className="py-14 bg-white border-b border-[#DCE2DF]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl" data-gsap="programs-hero">
            <h1 className="display-hero font-semibold text-[#0F1D26] mb-3">
              {t.programs.title}
            </h1>
            <p className="text-base md:text-lg text-[#4A5862] leading-relaxed max-w-[60ch]">
              {t.programs.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Filter & Grid Section */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Controls: Category Filter + Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 pb-6 border-b border-[#DCE2DF]">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter programs by category">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`min-h-10 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-[#0F1D26] text-white border-[#0F1D26]'
                        : 'bg-white text-[#4A5862] border-[#DCE2DF] hover:border-[#005A87] hover:text-[#0F1D26]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <label htmlFor="program-search-input" className="visually-hidden">
                {t.programs.searchPlaceholder}
              </label>
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A5862] w-4 h-4 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="program-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.programs.searchPlaceholder}
                className="pl-10 pr-8 py-2.5 border border-[#DCE2DF] rounded-lg bg-white w-full focus:border-[#005A87] outline-none text-sm text-[#0F1D26] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4A5862] hover:text-[#0F1D26] p-1 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl h-80 border border-[#DCE2DF] p-6 flex flex-col justify-between"
                >
                  <div className="h-36 bg-[#EEF2F0] rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-[#EEF2F0] rounded" />
                    <div className="h-5 w-3/4 bg-[#EEF2F0] rounded" />
                    <div className="h-4 w-full bg-[#EEF2F0] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#DCE2DF] p-8">
              <h2 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                {t.programs.noProgramsFound}
              </h2>
              {(selectedCategory !== 'all' || searchQuery.trim() !== '') && (
                <RollingTextButton
                  type="button"
                  magnetic={false}
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  label="Filter zurücksetzen"
                  className="mt-3 min-h-10 px-5 py-2 bg-[#005A87] hover:bg-[#004569] text-white text-sm rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center justify-center"
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrograms.map((program) => (
                <article
                  key={program.id}
                  data-gsap="program-card"
                  className="bg-white rounded-xl overflow-hidden program-card-shadow flex flex-col h-full border border-[#DCE2DF] group"
                >
                  <div className="aspect-video w-full overflow-hidden bg-[#EEF2F0] relative">
                    <img
                      src={program.imageUrl}
                      alt={program.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`${getTagBadgeStyle(
                          program.category
                        )} px-2.5 py-0.5 rounded text-xs font-semibold`}
                      >
                        {program.tag}
                      </span>
                    </div>

                    <h2 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2 group-hover:text-[#005A87] transition-colors">
                      {program.title}
                    </h2>
                    <p className="text-[#4A5862] text-sm leading-relaxed mb-5 flex-grow">
                      {program.description}
                    </p>

                    {/* Key Logistics Preview */}
                    <div className="space-y-1.5 pt-3.5 pb-4 border-t border-[#EEF2F0] text-xs text-[#4A5862]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#005A87] shrink-0" aria-hidden="true" />
                        <span className="truncate">{program.dateOrSchedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#005A87] shrink-0" aria-hidden="true" />
                        <span className="truncate">{program.location}</span>
                      </div>
                    </div>

                    <RollingTextButton
                      type="button"
                      magnetic={false}
                      onClick={() => openProgramModal(program)}
                      label={t.programs.viewDetails}
                      className="w-full min-h-11 bg-[#F6F7F4] hover:bg-[#005A87] text-[#0F1D26] hover:text-white border border-[#DCE2DF] hover:border-[#005A87] font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Suggestion Call to Action Banner */}
      <section className="py-16 bg-[#0F1D26] text-white border-t border-[#DCE2DF]">
        <div
          data-gsap="programs-cta"
          className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
        >
          <div className="max-w-2xl">
            <h2 className="display-section font-semibold mb-2 text-white">
              {t.programs.askDirector}
            </h2>
            <p className="text-base text-[#F6F7F4]/85 leading-relaxed max-w-[60ch]">
              {t.programs.askDirectorSubtitle}
            </p>
          </div>
          <RollingTextButton
            type="button"
            onClick={() => {
              if (dirTimerRef.current) {
                clearTimeout(dirTimerRef.current);
                dirTimerRef.current = null;
              }
              setDirectorSubmitted(false);
              setDirectorModalOpen(true);
            }}
            label={t.programs.askDirector}
            className="min-h-12 bg-white hover:bg-[#EEF2F0] text-[#0F1D26] px-7 py-3.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
          />
        </div>
      </section>

      {/* Learn More Modal */}
      {activeModalProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-program-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1D26]/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DCE2DF] p-6 relative">
            <button
              type="button"
              onClick={closeProgramModal}
              aria-label="Close program details"
              className="min-h-10 min-w-10 absolute top-4 right-4 p-2 text-[#4A5862] hover:text-[#0F1D26] rounded-full hover:bg-[#F6F7F4] transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="aspect-video w-full rounded-xl overflow-hidden mb-5 relative bg-[#EEF2F0]">
              <img
                src={activeModalProgram.imageUrl}
                alt={activeModalProgram.title}
                className="w-full h-full object-cover"
              />
              <span
                className={`absolute top-3 left-3 ${getTagBadgeStyle(
                  activeModalProgram.category
                )} px-2.5 py-1 rounded text-xs font-semibold`}
              >
                {activeModalProgram.tag}
              </span>
            </div>

            <h3 id="modal-program-title" className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-2">
              {activeModalProgram.title}
            </h3>
            <p className="text-[#4A5862] text-sm leading-relaxed mb-5">
              {activeModalProgram.detailedOverview}
            </p>

            <div className="space-y-2.5 bg-[#F6F7F4] border border-[#DCE2DF] p-4 rounded-xl mb-6 text-sm text-[#0F1D26]">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#005A87] shrink-0" aria-hidden="true" />
                <span><strong>{t.programs.schedule}:</strong> {activeModalProgram.dateOrSchedule}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#005A87] shrink-0" aria-hidden="true" />
                <span><strong>{t.programs.location}:</strong> {activeModalProgram.location}</span>
              </div>
              {activeModalProgram.participantsCount && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#005A87] shrink-0" aria-hidden="true" />
                  <span><strong>{t.programs.attendees}:</strong> {activeModalProgram.participantsCount}</span>
                </div>
              )}
            </div>

            {/* Registration mini-form */}
            {registrationSubmitted ? (
              <div role="status" className="p-4 bg-[#E7F3EE] border border-[#0D6E52]/30 rounded-xl text-[#0D6E52] flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium">{t.programs.registrationSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <p className="text-xs font-bold text-[#0F1D26]">
                  {t.programs.registerModalTitle}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-full-name" className="block text-xs font-medium text-[#4A5862] mb-1">
                      {t.programs.fullName}
                    </label>
                    <input
                      id="reg-full-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      required
                      placeholder={t.programs.fullName}
                      className="w-full px-3 py-2 text-sm border border-[#DCE2DF] rounded-lg focus:border-[#005A87] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-medium text-[#4A5862] mb-1">
                      {t.programs.emailAddress}
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder={t.programs.emailAddress}
                      className="w-full px-3 py-2 text-sm border border-[#DCE2DF] rounded-lg focus:border-[#005A87] outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <RollingTextButton
                    type="submit"
                    magnetic={false}
                    leftIcon={<Send className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    label={t.programs.registerNow}
                    className="flex-1 min-h-11 py-2.5 px-4 bg-[#005A87] text-white rounded-lg text-sm font-semibold hover:bg-[#004569] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      closeProgramModal();
                      navigate('/donate');
                    }}
                    className="min-h-11 px-4 py-2.5 border border-[#DCE2DF] text-[#0F1D26] rounded-lg text-sm font-semibold hover:bg-[#F6F7F4] cursor-pointer"
                  >
                    {t.nav.donate}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Program Director Proposal Modal */}
      {directorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="director-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1D26]/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-2xl border border-[#DCE2DF]">
            <button
              type="button"
              onClick={closeDirectorModal}
              aria-label="Close question dialog"
              className="min-h-10 min-w-10 absolute top-4 right-4 text-[#4A5862] hover:text-[#0F1D26] cursor-pointer inline-flex items-center justify-center"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <h3 id="director-modal-title" className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-1">
              {t.programs.askQuestionTitle}
            </h3>
            <p className="text-sm text-[#4A5862] mb-5">
              {t.programs.askDirectorSubtitle}
            </p>

            {directorSubmitted ? (
              <div role="status" className="p-6 bg-[#E7F3EE] rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#0D6E52] mx-auto" aria-hidden="true" />
                <h4 className="font-bold text-[#0F1D26]">{t.programs.questionSuccess}</h4>
              </div>
            ) : (
              <form onSubmit={handleDirectorSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="dir-name" className="block text-xs font-semibold text-[#0F1D26] mb-1">
                    {t.programs.fullName}
                  </label>
                  <input
                    id="dir-name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="z.B. Ahmad Zulfikar"
                    className="w-full px-3 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dir-email" className="block text-xs font-semibold text-[#0F1D26] mb-1">
                    {t.programs.emailAddress}
                  </label>
                  <input
                    id="dir-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@example.ch"
                    className="w-full px-3 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dir-topic" className="block text-xs font-semibold text-[#0F1D26] mb-1">
                    {t.programs.questionTopic}
                  </label>
                  <input
                    id="dir-topic"
                    type="text"
                    required
                    placeholder={t.programs.questionTopic}
                    className="w-full px-3 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dir-question" className="block text-xs font-semibold text-[#0F1D26] mb-1">
                    {t.programs.yourQuestion}
                  </label>
                  <textarea
                    id="dir-question"
                    rows={3}
                    required
                    placeholder={t.programs.yourQuestion}
                    className="w-full px-3 py-2.5 border border-[#DCE2DF] rounded-lg text-sm focus:border-[#005A87] outline-none resize-none"
                  />
                </div>
                <RollingTextButton
                  type="submit"
                  magnetic={false}
                  label={t.programs.submitQuestion}
                  className="w-full min-h-11 py-3 px-4 bg-[#005A87] text-white rounded-lg font-semibold text-sm hover:bg-[#004569] transition-colors cursor-pointer inline-flex items-center justify-center"
                />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
