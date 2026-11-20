import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { CommunityEvent, Program } from '../types';
import { DONATION_HERO_IMAGE, EVENT_PHOTOS } from '../constants';
import { subscribeEvents, subscribePrograms } from '../lib/firestoreContent';
import { EventCalendar } from './EventCalendar';
import { RollingTextButton } from './RollingTextButton';
import { useLanguage } from '../i18n';
import {
  Shield,
  HeartHandshake,
  Users,
  Calendar,
  MapPin,
  Scale,
  AlertCircle,
} from 'lucide-react';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

export function formatLocalIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function selectNextEvent(
  events: CommunityEvent[],
  todayIso: string = formatLocalIsoDate()
): CommunityEvent | undefined {
  return events.find((evt) => evt.date >= todayIso) ?? events[events.length - 1];
}

export function eventStart(evt: Pick<CommunityEvent, 'date' | 'time'>): Date {
  const m = /(\d{1,2}):(\d{2})/.exec(evt.time ?? '');
  const [y, mo, d] = evt.date.split('-').map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, m ? Number(m[1]) : 0, m ? Number(m[2]) : 0);
}

export interface CountdownLabels {
  day: string;
  days: string;
  hours: string;
  minutes: string;
}

const DEFAULT_COUNTDOWN_LABELS: CountdownLabels = {
  day: 'Tag',
  days: 'Tagen',
  hours: 'Std.',
  minutes: 'Min.',
};

export function formatCountdown(
  ms: number,
  labels: CountdownLabels = DEFAULT_COUNTDOWN_LABELS
): string | null {
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days >= 1) {
    return `${days} ${days === 1 ? labels.day : labels.days}${hours ? `, ${hours} ${labels.hours}` : ''}`;
  }
  if (hours >= 1) return `${hours} ${labels.hours} ${rest} ${labels.minutes}`;
  return `${rest} ${labels.minutes}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const HomeView: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewQuickX = useRef<gsap.QuickToFunc | null>(null);
  const previewQuickY = useRef<gsap.QuickToFunc | null>(null);
  const previewQuickRot = useRef<gsap.QuickToFunc | null>(null);
  const lastPointerX = useRef<number | null>(null);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programsError, setProgramsError] = useState<string | null>(null);

  const [activePillarIdx, setActivePillarIdx] = useState<number>(0);

  useEffect(() => {
    const unsubEvents = subscribeEvents((res) => {
      setEvents(res.data);
      setEventsLoading(res.loading);
      setEventsError(res.error);
    });
    const unsubPrograms = subscribePrograms((res) => {
      setPrograms(res.data);
      setProgramsLoading(res.loading);
      setProgramsError(res.error);
    });
    return () => {
      unsubEvents();
      unsubPrograms();
    };
  }, []);

  const todayIso = formatLocalIsoDate();
  const nextEvent = useMemo(() => selectNextEvent(events, todayIso), [events, todayIso]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = useMemo(
    () =>
      nextEvent
        ? formatCountdown(eventStart(nextEvent).getTime() - now, {
            day: t.home.countdownDay,
            days: t.home.countdownDays,
            hours: t.home.countdownHours,
            minutes: t.home.countdownMinutes,
          })
        : null,
    [nextEvent, now, t]
  );

  const pillarItems = useMemo(
    () => [
      {
        to: '/programs',
        icon: Users,
        title: t.home.activeProgramsTitle,
        desc: t.home.activeProgramsDesc,
        cta: t.home.viewAllPrograms,
        previewPhoto: EVENT_PHOTOS[3],
      },
      {
        to: '/donate',
        icon: Shield,
        title: t.home.transparentGivingTitle,
        desc: t.home.transparentGivingDesc,
        cta: t.home.supportCampaigns,
        previewPhoto: EVENT_PHOTOS[4],
      },
      {
        to: '/login',
        icon: HeartHandshake,
        title: t.home.communityMembersTitle,
        desc: t.home.communityMembersDesc,
        cta: t.home.joinPortal,
        previewPhoto: EVENT_PHOTOS[0],
      },
    ],
    [t]
  );

  const bentoTiles = useMemo(
    () => ({
      leftTop: EVENT_PHOTOS[1],
      leftBottom: EVENT_PHOTOS[3],
      center: {
        imageUrl: DONATION_HERO_IMAGE,
        alt: 'Gemeinschaftstreffen des Vereins Percikan Iman Schweiz',
        caption: 'Gemeinschaft in der Schweiz · 5 Zentren',
      },
      rightTop: EVENT_PHOTOS[4],
      rightBottom: EVENT_PHOTOS[2],
    }),
    []
  );

  // Prototype 1A: SplitText masked editorial hero headline
  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          if (reduceMotion || !heroTitleRef.current) return;

          const split = SplitText.create(heroTitleRef.current, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: 0.85,
                stagger: 0.1,
                ease: 'power4.out',
              });
            },
          });

          return () => {
            split.revert();
          };
        }
      );
    },
    { scope: rootRef, dependencies: [language], revertOnUpdate: true }
  );

  // Prototype 1C + 2B + Core ScrollTrigger Choreography
  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          isDesktop: '(min-width: 1024px)',
          isMobile: '(max-width: 1023px)',
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          if (reduceMotion) return;

          // 1. Scroll progress hairline scrubbed across HomeView
          gsap.to('[data-gsap="progress"]', {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.25,
            },
          });

          // 2. Hero staggered entrance (excludes h1 handled by SplitText)
          gsap.from('[data-gsap="hero-stagger"]', {
            y: isDesktop ? 22 : 12,
            opacity: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          });

          // 3. Count-up hero stats (126 & 5)
          const countEls = gsap.utils.toArray<HTMLElement>('[data-count-to]');
          countEls.forEach((el) => {
            const target = Number(el.dataset.countTo ?? 0);
            const counter = { val: 0 };
            gsap.to(counter, {
              val: target,
              duration: 1.15,
              ease: 'power2.out',
              snap: { val: 1 },
              onUpdate: () => {
                el.textContent = String(counter.val);
              },
            });
          });

          // 4. Scrubbed Bento Mosaic Gallery
          if (isDesktop) {
            gsap.fromTo(
              '[data-gsap="bento-grid"]',
              { scale: 0.92 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'top 22%',
                  scrub: 0.65,
                },
              }
            );

            gsap.fromTo(
              '[data-bento-side="left"]',
              { x: -32, y: 18, opacity: 0.78 },
              {
                x: 0,
                y: 0,
                opacity: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'top 22%',
                  scrub: 0.65,
                },
              }
            );

            gsap.fromTo(
              '[data-bento-side="right"]',
              { x: 32, y: 18, opacity: 0.78 },
              {
                x: 0,
                y: 0,
                opacity: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'top 22%',
                  scrub: 0.65,
                },
              }
            );

            gsap.fromTo(
              '[data-bento-center]',
              { clipPath: 'inset(6% 4% 6% 4% round 20px)' },
              {
                clipPath: 'inset(0% 0% 0% 0% round 12px)',
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'top 22%',
                  scrub: 0.65,
                },
              }
            );

            gsap.fromTo(
              '[data-bento-img]',
              { scale: 1.12 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'bottom top',
                  scrub: 0.65,
                },
              }
            );
          } else {
            gsap.fromTo(
              '[data-gsap="bento-grid"]',
              { scale: 0.96 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'top 22%',
                  scrub: 0.65,
                },
              }
            );

            gsap.fromTo(
              '[data-bento-img]',
              { scale: 1.06 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-gsap="bento-section"]',
                  start: 'top 92%',
                  end: 'bottom top',
                  scrub: 0.65,
                },
              }
            );
          }

          // 5. Pillar rules draw in, then columns stagger up
          const pillarTl = gsap.timeline({
            scrollTrigger: {
              trigger: '[data-gsap="pillars-section"]',
              start: 'top 78%',
              once: true,
            },
          });

          pillarTl
            .from('[data-gsap="pillar-rule"]', {
              scaleX: 0,
              duration: 0.65,
              stagger: 0.1,
              ease: 'power2.inOut',
              clearProps: 'transform',
            })
            .from(
              '[data-gsap="pillar-item"]',
              {
                y: isDesktop ? 24 : 14,
                opacity: 0,
                duration: 0.6,
                stagger: 0.12,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
              },
              '-=0.3'
            );

          // 6. Desktop cursor-tracking preview quickTo drivers
          if (isDesktop && previewRef.current) {
            previewQuickX.current = gsap.quickTo(previewRef.current, 'x', {
              duration: 0.35,
              ease: 'power3.out',
            });
            previewQuickY.current = gsap.quickTo(previewRef.current, 'y', {
              duration: 0.35,
              ease: 'power3.out',
            });
            previewQuickRot.current = gsap.quickTo(previewRef.current, 'rotation', {
              duration: 0.35,
              ease: 'power3.out',
            });
          } else {
            previewQuickX.current = null;
            previewQuickY.current = null;
            previewQuickRot.current = null;
          }

          return () => {
            countEls.forEach((el) => {
              el.textContent = el.dataset.countTo ?? '';
            });
            previewQuickX.current = null;
            previewQuickY.current = null;
            previewQuickRot.current = null;
          };
        }
      );
    },
    { scope: rootRef }
  );

  // Stagger featured program cards once loaded
  useGSAP(
    () => {
      if (programsLoading || programs.length === 0) return;
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          isDesktop: '(min-width: 1024px)',
          isMobile: '(max-width: 1023px)',
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          if (reduceMotion) return;

          gsap.from('[data-gsap="program-card"]', {
            y: isDesktop ? 26 : 14,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: '[data-gsap="programs-grid"]',
              start: 'top 82%',
              once: true,
            },
          });
        }
      );
    },
    { scope: rootRef, dependencies: [programsLoading, programs.length] }
  );

  const { contextSafe } = useGSAP({ scope: rootRef });

  const handlePillarGridMove = contextSafe((e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || !previewQuickX.current || !previewQuickY.current) return;
    const dx = lastPointerX.current === null ? 0 : e.clientX - lastPointerX.current;
    lastPointerX.current = e.clientX;
    previewQuickX.current(e.clientX + 20);
    previewQuickY.current(e.clientY - 70);
    previewQuickRot.current?.(gsap.utils.clamp(-6, 6, dx * 0.45));
  });

  const handlePillarEnter = contextSafe((idx: number, e: React.PointerEvent<HTMLElement>) => {
    setActivePillarIdx(idx);
    if (prefersReducedMotion() || !previewRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      lastPointerX.current = e.clientX;
      previewQuickX.current?.(e.clientX + 20);
      previewQuickY.current?.(e.clientY - 70);
      gsap.to(previewRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  });

  const handlePillarGridLeave = contextSafe(() => {
    lastPointerX.current = null;
    if (prefersReducedMotion() || !previewRef.current) return;
    gsap.to(previewRef.current, {
      opacity: 0,
      scale: 0.9,
      duration: 0.25,
      ease: 'power2.in',
      overwrite: 'auto',
    });
  });

  const activePreview = pillarItems[activePillarIdx]?.previewPhoto ?? EVENT_PHOTOS[0];

  return (
    <div ref={rootRef} className="w-full relative">
      {/* Scroll progress hairline */}
      <div
        data-gsap="progress"
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none origin-left scale-x-0 bg-[#005A87]"
      />

      {/* Desktop cursor-tracking preview for ruled pillars */}
      <div
        ref={previewRef}
        data-gsap="pillar-preview"
        aria-hidden="true"
        className="hidden lg:block pointer-events-none fixed top-0 left-0 z-40 w-64 aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-white/70 bg-[#0F1D26] opacity-0 scale-90"
      >
        <img
          src={activePreview.imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F1D26]/90 via-[#0F1D26]/55 to-transparent p-3 text-white">
          <p className="text-[11px] font-mono text-[#9CC4E4] truncate">
            {activePreview.location} · {activePreview.year}
          </p>
          <p className="text-xs font-semibold leading-snug line-clamp-1">{activePreview.title}</p>
        </div>
      </div>

      {/* Hero */}
      <section className="relative bg-white border-b border-[#DCE2DF] overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 relative z-10">
            <p
              data-gsap="hero-stagger"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4A5862] mb-6"
            >
              <Scale className="w-3.5 h-3.5 text-[#005A87]" aria-hidden="true" />
              <span>Schweizer Verein (Art. 60–79 ZGB)</span>
              <span className="font-mono text-[11px] text-[#0F1D26]">UID CHE-382.914.820</span>
            </p>

            <h1
              key={language}
              ref={heroTitleRef}
              className="display-hero font-semibold text-[#0F1D26] mb-6 max-w-[18ch]"
            >
              {t.home.heroTitle}
            </h1>

            <p
              data-gsap="hero-stagger"
              className="text-base md:text-lg text-[#4A5862] leading-relaxed mb-8 max-w-[56ch]"
            >
              {t.home.heroSubtitle}
            </p>

            <div data-gsap="hero-stagger" className="flex flex-wrap items-center gap-3.5 mb-10">
              <RollingTextButton
                label={t.home.explorePrograms}
                onClick={() => navigate('/programs')}
                className="min-h-12 px-6 py-3 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              />
              <RollingTextButton
                label={t.home.makeContribution}
                onClick={() => navigate('/donate')}
                className="min-h-12 px-6 py-3 border border-[#B8C4BE] hover:border-[#0F1D26] text-[#0F1D26] rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              />
            </div>

            <dl data-gsap="hero-stagger" className="flex flex-wrap gap-x-10 gap-y-4 text-[#0F1D26]">
              <div>
                <dd
                  data-count-to="126"
                  className="font-editorial text-2xl font-semibold tabular-nums"
                >
                  126
                </dd>
                <dt className="text-xs text-[#4A5862]">
                  Mitgliedschaften · 77 Familien, 49 Einzelne
                </dt>
              </div>
              <div>
                <dd
                  data-count-to="5"
                  className="font-editorial text-2xl font-semibold tabular-nums"
                >
                  5
                </dd>
                <dt className="text-xs text-[#4A5862]">Zentren, u.a. Volketswil, Baar, Stadel</dt>
              </div>
            </dl>
          </div>

          {/* Floating next-event card */}
          <div className="lg:col-span-5 flex items-center lg:justify-end">
            {nextEvent && (
              <div
                data-gsap="hero-stagger"
                className="w-full bg-[#0F1D26] text-white rounded-xl p-6 shadow-[0_18px_40px_-18px_rgba(15,29,38,0.55)]"
              >
                <p className="text-xs text-[#9CC4E4] mb-1.5" aria-live="off">
                  {countdown
                    ? `${t.home.nextEventStartsIn} ${countdown}`
                    : nextEvent.date >= todayIso
                      ? t.home.nextEventLiveToday
                      : t.home.nextEventPast}
                </p>

                <h2 className="text-lg font-bold leading-snug">{nextEvent.title}</h2>

                <p className="mt-2.5 text-xs text-[#C9D4DC] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono tabular-nums">
                    {nextEvent.date}
                    {nextEvent.time ? ` · ${nextEvent.time}` : ''}
                  </span>
                  {nextEvent.location && (
                    <span className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{nextEvent.location}</span>
                    </span>
                  )}
                </p>

                <div className="mt-5">
                  <RollingTextButton
                    label={t.home.nextEventDetails}
                    magnetic={false}
                    onClick={() => navigate('/programs')}
                    className="min-h-9 px-3.5 py-2 bg-white text-[#0F1D26] hover:bg-[#EEF2F0] rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center justify-center"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scrubbed Bento Mosaic Gallery */}
      <section
        data-gsap="bento-section"
        aria-label="Einblicke aus der Gemeinschaft"
        className="py-6 md:py-10 overflow-hidden bg-[#F6F7F4] border-b border-[#DCE2DF]"
      >
        <div
          data-gsap="bento-grid"
          className="max-w-[1280px] mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-stretch"
        >
          {/* Left column: 2 stacked tiles */}
          <div data-bento-side="left" className="col-span-1 md:col-span-3 flex flex-col gap-3 md:gap-4">
            {[bentoTiles.leftTop, bentoTiles.leftBottom].map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => navigate('/gallery')}
                className="relative h-36 md:h-44 w-full rounded-xl overflow-hidden bg-[#EEF2F0] border border-[#DCE2DF] text-left group cursor-pointer"
              >
                <img
                  data-bento-img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-2.5 bottom-2.5 px-2 py-0.5 rounded bg-[#0F1D26]/75 backdrop-blur-sm text-white font-mono text-[10px]">
                  {photo.location.split(',')[0]} · {photo.year}
                </span>
              </button>
            ))}
          </div>

          {/* Center hero tile */}
          <div
            data-bento-center
            className="order-first md:order-none col-span-2 md:col-span-6"
          >
            <button
              type="button"
              onClick={() => navigate('/gallery')}
              className="relative h-52 md:h-[368px] w-full rounded-xl overflow-hidden bg-[#EEF2F0] border border-[#DCE2DF] text-left group cursor-pointer"
            >
              <img
                data-bento-img
                src={bentoTiles.center.imageUrl}
                alt={bentoTiles.center.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F1D26]/75 via-[#0F1D26]/25 to-transparent p-4 flex items-end justify-between gap-3">
                <span className="text-xs md:text-sm font-semibold text-white">
                  {bentoTiles.center.caption}
                </span>
                <span className="font-mono text-[11px] text-[#9CC4E4] shrink-0">
                  Fotokatalog →
                </span>
              </div>
            </button>
          </div>

          {/* Right column: 2 stacked tiles */}
          <div data-bento-side="right" className="col-span-1 md:col-span-3 flex flex-col gap-3 md:gap-4">
            {[bentoTiles.rightTop, bentoTiles.rightBottom].map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => navigate('/gallery')}
                className="relative h-36 md:h-44 w-full rounded-xl overflow-hidden bg-[#EEF2F0] border border-[#DCE2DF] text-left group cursor-pointer"
              >
                <img
                  data-bento-img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-2.5 bottom-2.5 px-2 py-0.5 rounded bg-[#0F1D26]/75 backdrop-blur-sm text-white font-mono text-[10px]">
                  {photo.location.split(',')[0]} · {photo.year}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Three pillars: ruled columns + cursor-tracking preview */}
      <section data-gsap="pillars-section" className="py-16 max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="display-section font-semibold text-[#0F1D26] mb-2">
            {t.home.pillarsTitle}
          </h2>
          <p className="text-[#4A5862] text-base max-w-[60ch]">
            {t.home.pillarsSubtitle}
          </p>
        </div>

        <div className="relative">
          <div data-gsap="pillar-rule" aria-hidden="true" className="h-px bg-[#DCE2DF] origin-left" />
          <div
            onPointerMove={handlePillarGridMove}
            onPointerLeave={handlePillarGridLeave}
            className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-[#DCE2DF]"
          >
            {pillarItems.map(({ to, icon: Icon, title, desc, cta }, idx) => (
              <article
                data-gsap="pillar-item"
                key={to}
                onPointerEnter={(e) => handlePillarEnter(idx, e)}
                className="group relative py-8 md:px-8 first:md:pl-0 last:md:pr-0"
              >
                <Icon className="w-5 h-5 text-[#005A87] mb-4" aria-hidden="true" />
                <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">{title}</h3>
                <p className="text-[#4A5862] text-sm leading-relaxed mb-6 max-w-[40ch]">{desc}</p>
                <button
                  type="button"
                  onClick={() => navigate(to)}
                  className="relative text-[#005A87] font-semibold text-sm cursor-pointer min-h-8 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-current after:origin-left after:scale-x-30 group-hover:after:scale-x-100 after:transition-transform after:duration-300 focus-visible:after:scale-x-100"
                >
                  {cta}
                </button>
              </article>
            ))}
          </div>
          <div data-gsap="pillar-rule" aria-hidden="true" className="h-px bg-[#DCE2DF] origin-left" />
        </div>
      </section>

      {/* Interactive Community Event Calendar */}
      <EventCalendar events={events} loading={eventsLoading} error={eventsError} />

      {/* Featured Preview of Programs & Campaigns */}
      <section className="py-16 bg-white border-t border-[#DCE2DF]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h2 className="display-section font-semibold text-[#0F1D26] mb-1.5">
                {t.home.featuredProgramsTitle}
              </h2>
              <p className="text-[#4A5862] text-sm max-w-[60ch]">
                {t.home.featuredProgramsSubtitle}
              </p>
            </div>
            <RollingTextButton
              label={t.home.viewAll6Programs}
              magnetic={false}
              onClick={() => navigate('/programs')}
              className="min-h-10 px-4 py-2 bg-[#F6F7F4] hover:bg-[#EEF2F0] border border-[#DCE2DF] text-[#0F1D26] rounded-lg font-semibold text-sm transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
            />
          </div>

          {programsError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{programsError}</span>
            </div>
          )}

          {programsLoading ? (
            <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#F6F7F4] rounded-xl h-80 border border-[#DCE2DF] p-6 flex flex-col justify-between"
                >
                  <div className="h-36 bg-[#EEF2F0] rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-[#EEF2F0] rounded" />
                    <div className="h-5 w-3/4 bg-[#EEF2F0] rounded" />
                    <div className="h-4 w-full bg-[#EEF2F0] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="bg-[#F6F7F4] rounded-xl border border-dashed border-[#DCE2DF] p-10 text-center">
              <p className="text-sm font-semibold text-[#0F1D26]">{t.programs.noProgramsFound}</p>
            </div>
          ) : (
            <div data-gsap="programs-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {programs.slice(0, 3).map((item) => (
                <article
                  data-gsap="program-card"
                  key={item.id}
                  onClick={() => navigate('/programs')}
                  className="bg-[#F6F7F4] rounded-xl overflow-hidden program-card-shadow cursor-pointer group border border-[#DCE2DF] flex flex-col"
                >
                  <div className="aspect-video w-full overflow-hidden bg-[#EEF2F0]">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow justify-between">
                    <div>
                      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 bg-white text-[#005A87] border border-[#DCE2DF] rounded">
                        {item.tag}
                      </span>
                      <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mt-3 mb-2 group-hover:text-[#005A87] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#4A5862] line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#DCE2DF] text-xs text-[#4A5862] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#005A87] shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.dateOrSchedule}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#005A87] shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
