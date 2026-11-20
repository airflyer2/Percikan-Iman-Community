import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { EventPhoto } from '../types';
import { EVENT_PHOTOS, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../constants';
import { useAuth } from '../context/AuthContext';
import { RollingTextButton } from './RollingTextButton';
import {
  Camera,
  Search,
  Calendar,
  MapPin,
  Users,
  Instagram,
  X,
  Share2,
  ExternalLink,
  Lock,
  KeyRound,
  Sparkles,
  Tag
} from 'lucide-react';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const GalleryView: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photos] = useState<EventPhoto[]>(EVENT_PHOTOS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePhoto, setActivePhoto] = useState<EventPhoto | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
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

          const heroItems = gsap.utils.toArray<HTMLElement>('[data-gsap="gallery-hero"]');
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

          const cards = gsap.utils.toArray<HTMLElement>('[data-gsap="gallery-card"]');
          if (cards.length > 0) {
            gsap.from(cards, {
              y: 20,
              opacity: 0,
              duration: 0.55,
              stagger: 0.06,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: cards[0],
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

  const categories = ['All', 'Familienlager', 'Pengajian', 'Ramadan & Eid', 'Youth & Education', 'Charity & Qurban'];
  const years = ['All', '2026', '2025'];

  const filteredPhotos = photos.filter((photo) => {
    const matchesCategory = selectedCategory === 'All' || photo.category === selectedCategory;
    const matchesYear = selectedYear === 'All' || photo.year.toString() === selectedYear;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      photo.title.toLowerCase().includes(q) ||
      photo.eventTitle.toLowerCase().includes(q) ||
      photo.location.toLowerCase().includes(q) ||
      photo.tags.some((t) => t.toLowerCase().includes(q));

    return matchesCategory && matchesYear && matchesQuery;
  });

  const handleSharePhoto = (photo: EventPhoto) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(`${window.location.origin} - ${photo.title} (${photo.eventTitle})`)
        .then(() => {
          setShareFeedback('Link in Zwischenablage kopiert!');
          if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
          shareTimerRef.current = setTimeout(() => {
            setShareFeedback(null);
            shareTimerRef.current = null;
          }, 2500);
        })
        .catch(() => {
          // Clipboard permission denied or unavailable
        });
    }
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-[#f9f9ff] py-10 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header section with Instagram Link and Member Notice */}
        <div
          data-gsap="gallery-hero"
          className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 md:p-8 shadow-xs"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eff3ff] text-[#006191] text-xs font-bold rounded-full uppercase tracking-wider border border-[#006191]/20">
                  <Camera className="w-3.5 h-3.5" />
                  Vereins-Fotokatalog
                </span>
                {currentUser && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                    Mitgliederzugriff aktiv
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#121c2a] tracking-tight">
                Impressionen &amp; Event-Bildergalerie
              </h1>
              <p className="text-sm text-[#3f4850] mt-1.5 max-w-2xl leading-relaxed">
                Fotodokumentation der Veranstaltungen des Vereins Percikan Iman Schweiz – vom Familienlager in Lörrach über monatliche Pengajian (Volketswil, Baar, Stadel) bis hin zu Jugendklassen und Hilfsaktionen.
              </p>
            </div>

            {/* Instagram Link Banner */}
            <div className="bg-gradient-to-br from-[#f9f9ff] via-[#fff5f8] to-[#eff3ff] p-4 sm:p-5 rounded-2xl border border-pink-200/80 shrink-0 max-w-sm w-full shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">Instagram Kanal</span>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Offiziell
                    </span>
                  </div>
                  <p className="text-xs text-[#3f4850] mt-0.5 font-medium">
                    {INSTAGRAM_HANDLE}
                  </p>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                  >
                    <span>Auf Instagram folgen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Member Privileges Notice / Guest Gate */}
          {!currentUser && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Exklusiver Mitglieder-Download &amp; Vollansicht
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Als registriertes Vereinsmitglied können Sie Veranstaltungsfotos in voller Auflösung herunterladen und teilen.
                  </p>
                </div>
              </div>
              <RollingTextButton
                type="button"
                magnetic={false}
                onClick={() => navigate('/login')}
                leftIcon={<KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                label="Als Mitglied anmelden"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#006191] text-white shadow-xs'
                    : 'bg-[#eff3ff] text-[#006191] hover:bg-[#d3e5f1]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Year Filter */}
          <div className="flex items-center gap-2.5">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-[#eff3ff] border border-[#bec7d2]/60 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#006191] outline-none cursor-pointer"
            >
              <option value="All">Alle Jahre</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Fotos nach Ort, Tag oder Anlass suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2]/60 rounded-xl text-xs text-[#121c2a] placeholder-[#566771] focus:bg-white focus:border-[#006191] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-[#566771] px-1">
          <span>
            Zeige <strong>{filteredPhotos.length}</strong> {filteredPhotos.length === 1 ? 'Foto' : 'Fotos'}
            {selectedCategory !== 'All' ? ` in «${selectedCategory}»` : ''}
          </span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Mehr auf Instagram {INSTAGRAM_HANDLE}</span>
          </a>
        </div>

        {/* Photo Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-12 text-center shadow-xs">
            <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#121c2a]">Keine Fotos gefunden</h3>
            <p className="text-xs text-[#566771] mt-1 max-w-sm mx-auto">
              Für diese Filterkombination liegen aktuell keine Bilder vor. Bitte passen Sie die Kategorie oder den Suchbegriff an.
            </p>
            <RollingTextButton
              type="button"
              magnetic={false}
              onClick={() => {
                setSelectedCategory('All');
                setSelectedYear('All');
                setSearchQuery('');
              }}
              label="Filter zurücksetzen"
              className="mt-4 px-4 py-2 bg-[#eff3ff] text-[#006191] rounded-xl text-xs font-bold hover:bg-[#d3e5f1] transition-colors cursor-pointer inline-flex items-center justify-center"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                data-gsap="gallery-card"
                onClick={() => setActivePhoto(photo)}
                className="group bg-white rounded-2xl border border-[#bec7d2]/60 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-xs font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Klicken für Vollansicht &amp; Details
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 bg-[#006191]/90 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-xs">
                      {photo.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold rounded-md">
                      {photo.year}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#006191] tracking-wider uppercase block">
                      {photo.eventTitle}
                    </span>
                    <h3 className="text-sm font-bold text-[#121c2a] mt-1 group-hover:text-[#006191] transition-colors line-clamp-2">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-[#3f4850] mt-1.5 line-clamp-2 leading-relaxed">
                      {photo.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#566771]">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#006191] shrink-0" />
                        <span className="truncate">{photo.location}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-[#006191]" />
                        {photo.date}
                      </span>
                    </div>

                    {photo.tags && photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {photo.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.2 bg-[#eff3ff] text-[#006191] rounded-md font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox / Modal View */}
        {activePhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col border border-gray-100">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                aria-label="Schliessen"
                className="absolute top-4 right-4 z-10 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors cursor-pointer"
                title="Schliessen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Photo Display */}
              <div className="relative bg-black flex items-center justify-center max-h-[55vh] overflow-hidden">
                <img
                  src={activePhoto.imageUrl}
                  alt={activePhoto.title}
                  className="w-full h-auto max-h-[55vh] object-contain"
                />
              </div>

              {/* Photo Details & Actions */}
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#eff3ff] text-[#006191] text-xs font-bold rounded-full">
                        {activePhoto.category}
                      </span>
                      <span className="text-xs font-semibold text-[#566771]">
                        {activePhoto.eventTitle}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#121c2a] mt-1.5">
                      {activePhoto.title}
                    </h2>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <RollingTextButton
                      type="button"
                      magnetic={false}
                      onClick={() => handleSharePhoto(activePhoto)}
                      leftIcon={<Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      label="Teilen"
                      className="px-3.5 py-2 bg-[#eff3ff] hover:bg-[#d3e5f1] text-[#006191] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    />

                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Instagram className="w-4 h-4" />
                      <span>Auf Instagram ansehen</span>
                    </a>
                  </div>
                </div>

                {shareFeedback && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                    {shareFeedback}
                  </div>
                )}

                <p className="text-sm text-[#3f4850] leading-relaxed">
                  {activePhoto.description}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-[#f9f9ff] rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-[#566771] uppercase tracking-wider block">Datum</span>
                    <span className="text-xs font-bold text-[#121c2a] mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#006191]" />
                      {activePhoto.date}
                    </span>
                  </div>

                  <div className="p-3 bg-[#f9f9ff] rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-[#566771] uppercase tracking-wider block">Veranstaltungsort</span>
                    <span className="text-xs font-bold text-[#121c2a] mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#006191] shrink-0" />
                      <span className="truncate">{activePhoto.location}</span>
                    </span>
                  </div>

                  {activePhoto.attendeesCount && (
                    <div className="p-3 bg-[#f9f9ff] rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-[#566771] uppercase tracking-wider block">Teilnehmer</span>
                      <span className="text-xs font-bold text-[#121c2a] mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#006191]" />
                        {activePhoto.attendeesCount} Personen
                      </span>
                    </div>
                  )}

                  {activePhoto.photographer && (
                    <div className="p-3 bg-[#f9f9ff] rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-[#566771] uppercase tracking-wider block">Foto / Dokumentation</span>
                      <span className="text-xs font-bold text-[#121c2a] mt-0.5 flex items-center gap-1 truncate">
                        <Camera className="w-3.5 h-3.5 text-[#006191] shrink-0" />
                        <span className="truncate">{activePhoto.photographer}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {activePhoto.tags && activePhoto.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-xs text-[#566771] flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#006191]" />
                      Schlagwörter:
                    </span>
                    {activePhoto.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-0.5 bg-[#eff3ff] text-[#006191] rounded-full font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
