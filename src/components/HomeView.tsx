import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityEvent, Program } from '../types';
import { DONATION_HERO_IMAGE } from '../constants';
import { subscribeEvents, subscribePrograms } from '../lib/firestoreContent';
import { EventCalendar } from './EventCalendar';
import { useLanguage } from '../i18n';
import { Shield, HeartHandshake, Users, Calendar, MapPin, Scale, AlertCircle } from 'lucide-react';

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

export const HomeView: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programsError, setProgramsError] = useState<string | null>(null);

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
  const nextEvent = selectNextEvent(events, todayIso);

  return (
    <div className="w-full">
      {/* Editorial Hero */}
      <section className="relative py-14 lg:py-22 bg-white border-b border-[#DCE2DF]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A5862] mb-5 pb-2 border-b border-[#DCE2DF]">
              <Scale className="w-3.5 h-3.5 text-[#005A87]" aria-hidden="true" />
              <span>Schweizer Verein (Art. 60–79 ZGB)</span>
              <span aria-hidden="true" className="text-[#B8C4BE]">/</span>
              <span className="font-mono text-[11px] text-[#0F1D26]">UID CHE-382.914.820</span>
              <span aria-hidden="true" className="text-[#B8C4BE]">/</span>
              <span>{t.home.heroTag}</span>
            </div>

            <h1 className="display-hero font-semibold text-[#0F1D26] mb-6">
              {t.home.heroTitle}
            </h1>

            <p className="text-base md:text-lg text-[#4A5862] leading-relaxed mb-8 max-w-[60ch]">
              {t.home.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3.5 mb-10">
              <button
                type="button"
                onClick={() => navigate('/programs')}
                className="min-h-12 px-6 py-3 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              >
                {t.home.explorePrograms}
              </button>
              <button
                type="button"
                onClick={() => navigate('/donate')}
                className="min-h-12 px-6 py-3 bg-[#F6F7F4] hover:bg-[#EEF2F0] border border-[#DCE2DF] text-[#0F1D26] rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              >
                {t.home.makeContribution}
              </button>
            </div>

            {/* Institutional Facts Strip */}
            <dl className="grid grid-cols-3 gap-4 pt-6 border-t border-[#DCE2DF] max-w-xl">
              <div>
                <dt className="text-xs text-[#4A5862]">Mitgliedschaft</dt>
                <dd className="font-editorial text-2xl font-semibold text-[#0F1D26] tabular-nums mt-0.5">
                  126 Einheiten
                </dd>
                <span className="text-[11px] text-[#4A5862] block">77 Familien &amp; 49 Einzelne</span>
              </div>
              <div className="border-l border-[#DCE2DF] pl-4">
                <dt className="text-xs text-[#4A5862]">Präsenz Schweiz</dt>
                <dd className="font-editorial text-2xl font-semibold text-[#0F1D26] tabular-nums mt-0.5">
                  5 Zentren
                </dd>
                <span className="text-[11px] text-[#4A5862] block">Volketswil, Baar, Stadel u.a.</span>
              </div>
              <div className="border-l border-[#DCE2DF] pl-4">
                <dt className="text-xs text-[#4A5862]">Rechenschaft</dt>
                <dd className="font-editorial text-2xl font-semibold text-[#0D6E52] tabular-nums mt-0.5">
                  Art. 8 &amp; 10
                </dd>
                <span className="text-[11px] text-[#4A5862] block">Geprüfte Jahresrechnung</span>
              </div>
            </dl>
          </div>

          {/* Right Column: Visual Frame + Live Community Pulse */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <figure className="relative rounded-xl overflow-hidden border border-[#DCE2DF] bg-[#EEF2F0] aspect-[4/3]">
              <img
                src={DONATION_HERO_IMAGE}
                alt="Gemeinschaftstreffen des Vereins Percikan Iman Schweiz"
                className="w-full h-full object-cover"
              />
            </figure>

            {nextEvent && (
              <div className="bg-[#F6F7F4] rounded-xl p-5 border border-[#DCE2DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0D6E52]">
                    <span className="w-2 h-2 rounded-full bg-[#0D6E52]" aria-hidden="true"></span>
                    <span>Nächster Termin • {nextEvent.date}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#0F1D26]">
                    {nextEvent.title}
                  </h2>
                  <p className="text-xs text-[#4A5862] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#005A87] shrink-0" aria-hidden="true" />
                    <span>{nextEvent.location}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/programs')}
                  className="min-h-9 px-3.5 py-2 bg-white hover:bg-[#EEF2F0] text-[#0F1D26] border border-[#DCE2DF] rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  Details ansehen
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3 Pillars Summary */}
      <section className="py-16 max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <h2 className="display-section font-semibold text-[#0F1D26] mb-2">
            {t.home.pillarsTitle}
          </h2>
          <p className="text-[#4A5862] text-base max-w-[60ch]">
            {t.home.pillarsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white p-7 rounded-xl border border-[#DCE2DF] program-card-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-lg bg-[#E6F0F5] text-[#005A87] flex items-center justify-center mb-5">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                {t.home.activeProgramsTitle}
              </h3>
              <p className="text-[#4A5862] text-sm leading-relaxed mb-6">
                {t.home.activeProgramsDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/programs')}
              className="text-[#005A87] hover:text-[#004569] font-semibold text-sm text-left underline underline-offset-4 cursor-pointer self-start min-h-8"
            >
              {t.home.viewAllPrograms}
            </button>
          </article>

          <article className="bg-white p-7 rounded-xl border border-[#DCE2DF] program-card-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-lg bg-[#E7F3EE] text-[#0D6E52] flex items-center justify-center mb-5">
                <Shield className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                {t.home.transparentGivingTitle}
              </h3>
              <p className="text-[#4A5862] text-sm leading-relaxed mb-6">
                {t.home.transparentGivingDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/donate')}
              className="text-[#005A87] hover:text-[#004569] font-semibold text-sm text-left underline underline-offset-4 cursor-pointer self-start min-h-8"
            >
              {t.home.supportCampaigns}
            </button>
          </article>

          <article className="bg-white p-7 rounded-xl border border-[#DCE2DF] program-card-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-lg bg-[#E6F0F5] text-[#005A87] flex items-center justify-center mb-5">
                <HeartHandshake className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                {t.home.communityMembersTitle}
              </h3>
              <p className="text-[#4A5862] text-sm leading-relaxed mb-6">
                {t.home.communityMembersDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#005A87] hover:text-[#004569] font-semibold text-sm text-left underline underline-offset-4 cursor-pointer self-start min-h-8"
            >
              {t.home.joinPortal}
            </button>
          </article>
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
            <button
              type="button"
              onClick={() => navigate('/programs')}
              className="min-h-10 px-4 py-2 bg-[#F6F7F4] hover:bg-[#EEF2F0] border border-[#DCE2DF] text-[#0F1D26] rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            >
              {t.home.viewAll6Programs}
            </button>
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
            <div
              aria-busy="true"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {programs.slice(0, 3).map((item) => (
                <article
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
