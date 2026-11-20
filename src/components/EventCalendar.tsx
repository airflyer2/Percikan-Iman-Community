import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityEvent } from '../types';
import { isSafeHttpUrl } from '../lib/urlValidation';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Video,
  Filter,
  X,
  Download,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface EventCalendarProps {
  events: CommunityEvent[];
  loading?: boolean;
  error?: string | null;
}

const CATEGORIES: Array<CommunityEvent['category'] | 'All'> = [
  'All',
  'Majelis & Spiritual',
  'Charity & Relief',
  'Youth & Education',
  'Community Gathering'
];

const CATEGORY_COLORS: Record<CommunityEvent['category'], { bg: string; text: string; border: string; dot: string }> = {
  'Majelis & Spiritual': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  'Charity & Relief': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
  },
  'Youth & Education': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  'Community Gathering': {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500'
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocalTodayParts(now: Date = new Date()): {
  year: number;
  month: number;
  dateStr: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
  return { year, month, dateStr };
}

export const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  loading = false,
  error = null
}) => {
  const navigate = useNavigate();

  // Calendar View State - Initialized from the user's current local date
  const todayParts = getLocalTodayParts();
  const [currentYear, setCurrentYear] = useState<number>(todayParts.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayParts.month);
  const [selectedDate, setSelectedDate] = useState<string>(todayParts.dateStr);
  const [activeCategory, setActiveCategory] = useState<CommunityEvent['category'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  // Modal State
  const [selectedEventModal, setSelectedEventModal] = useState<CommunityEvent | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState<string | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = getLocalTodayParts();
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    setSelectedDate(today.dateStr);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      const matchCategory = activeCategory === 'All' || evt.category === activeCategory;
      const matchSearch =
        q === '' ||
        (evt.title || '').toLowerCase().includes(q) ||
        (evt.location || '').toLowerCase().includes(q) ||
        (evt.speaker || '').toLowerCase().includes(q) ||
        (evt.description || '').toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [events, activeCategory, searchQuery]);

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CommunityEvent[]>();
    filteredEvents.forEach((evt) => {
      const existing = map.get(evt.date) || [];
      existing.push(evt);
      map.set(evt.date, existing);
    });
    return map;
  }, [filteredEvents]);

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: CommunityEvent[];
    }> = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || []
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        events: eventsByDate.get(dateStr) || []
      });
    }

    // Next month filler days (fill up to 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || []
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate]);

  // Events on the currently selected date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((evt) => evt.date === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Next upcoming events
  const upcomingEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents]);

  // Safe date formatter avoiding "Invalid Date" crashes
  const formatEventDate = (
    dateStr: string,
    options: Intl.DateTimeFormatOptions
  ): string => {
    const parsed = new Date(`${dateStr || ''}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return dateStr || 'TBD';
    }
    return parsed.toLocaleDateString('en-US', options);
  };

  // Google Calendar URL Generator
  const generateGoogleCalendarUrl = (evt: CommunityEvent) => {
    const title = encodeURIComponent(evt.title || '');
    const details = encodeURIComponent(
      `${evt.description || ''}\n\nSpeaker: ${evt.speaker || 'Percikan Iman Team'}\nOrganized by Percikan Iman Community.`
    );
    const location = encodeURIComponent(evt.location || '');

    const cleanDate = (evt.date || '').replace(/-/g, '');
    const dates = `${cleanDate}T090000Z/${cleanDate}T120000Z`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
  };

  // Download iCal (.ics) file
  const downloadIcsFile = (evt: CommunityEvent) => {
    const cleanDate = (evt.date || '').replace(/-/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Percikan Iman Community//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${evt.id}-${Date.now()}@percikaniman.org`,
      `DTSTAMP:${cleanDate}T000000Z`,
      `DTSTART:${cleanDate}T090000Z`,
      `DTEND:${cleanDate}T120000Z`,
      `SUMMARY:${evt.title || ''}`,
      `DESCRIPTION:${(evt.description || '').replace(/\n/g, ' ')}`,
      `LOCATION:${evt.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', `${evt.id}-percikan-iman.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  // RSVP handler
  const handleRsvp = (evt: CommunityEvent) => {
    setRsvpSuccess(
      `Successfully RSVP'd for "${evt.title}". A confirmation has been registered for your member profile.`
    );
    setTimeout(() => {
      setRsvpSuccess(null);
    }, 4000);
  };

  return (
    <section id="community-event-calendar" className="py-16 md:py-20 bg-white border-y border-[#e6eeff]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff3ff] text-[#006191] text-xs font-bold uppercase tracking-wider mb-3 border border-[#d3e5f1]">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Percikan Iman Agenda</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#121c2a] tracking-tight">
              Community Event Calendar
            </h2>
            <p className="text-[#3f4850] text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              Discover upcoming Majelis Ilmu sessions, humanitarian relief drives, youth leadership labs,
              and community gatherings. Select any day to view schedules, RSVP, or sync with your personal calendar.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="p-1 bg-[#f0f4f9] rounded-xl flex items-center border border-[#bec7d2]/40">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#006191] shadow-2xs'
                    : 'text-[#566771] hover:text-[#121c2a]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'agenda'
                    ? 'bg-white text-[#006191] shadow-2xs'
                    : 'text-[#566771] hover:text-[#121c2a]'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>All Events ({filteredEvents.length})</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-[#f9f9ff] p-4 rounded-2xl border border-[#bec7d2]/40 mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-[#566771] mr-1.5 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" />
                <span>Categories:</span>
              </span>
              {CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#006191] text-white border-[#006191] shadow-2xs'
                        : 'bg-white text-[#3f4850] border-[#bec7d2]/60 hover:border-[#006191] hover:text-[#006191]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event, speaker, venue..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191] focus:ring-2 focus:ring-[#006191]/20 transition-all placeholder:text-[#6f7881]/60"
              />
              <Search className="w-4 h-4 text-[#6f7881] absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Notification Banner if RSVP'd */}
        {rsvpSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{rsvpSuccess}</span>
          </div>
        )}

        {/* Loading / Empty / Main Calendar & Agenda */}
        {loading ? (
          <div
            aria-busy="true"
            className="bg-[#f9f9ff] rounded-2xl border border-[#bec7d2]/40 p-12 text-center text-sm text-[#566771]"
          >
            Loading community events...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-dashed border-[#bec7d2] text-center space-y-2">
            <CalendarIcon className="w-10 h-10 text-[#6f7881] mx-auto" />
            <h3 className="font-bold text-[#121c2a] text-base">
              0 Events — No Scheduled Events
            </h3>
            <p className="text-xs text-[#566771] max-w-md mx-auto">
              There are currently no community events published in the agenda.
            </p>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Monthly Calendar Widget (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#bec7d2]/50 shadow-xs">
              {/* Month Selector Bar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#eff3ff] text-[#006191] flex items-center justify-center font-bold">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-[#121c2a]">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </h3>
                    <p className="text-xs text-[#566771]">
                      {filteredEvents.filter((e) => e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length} events this month
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="px-2.5 py-1 text-xs font-bold text-[#006191] hover:bg-[#eff3ff] rounded-lg transition-colors cursor-pointer border border-[#d3e5f1]"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 text-[#566771] hover:text-[#121c2a] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 text-[#566771] hover:text-[#121c2a] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEKDAY_NAMES.map((w, idx) => (
                  <div
                    key={w}
                    className={`py-1.5 text-xs font-bold uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? 'text-amber-700' : 'text-[#566771]'
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell) => {
                  const isSelected = cell.dateStr === selectedDate;
                  const isToday = cell.dateStr === todayParts.dateStr;
                  const hasEvents = cell.events.length > 0;

                  return (
                    <button
                      type="button"
                      key={cell.dateStr}
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`min-h-[72px] sm:min-h-[82px] p-1.5 rounded-xl text-left flex flex-col justify-between transition-all cursor-pointer border relative group ${
                        isSelected
                          ? 'bg-[#eff3ff] border-[#006191] ring-2 ring-[#006191]/30 shadow-2xs'
                          : hasEvents
                          ? 'bg-white border-[#bec7d2]/60 hover:border-[#006191]/60 hover:bg-[#f9f9ff]'
                          : cell.isCurrentMonth
                          ? 'bg-[#fbfcfe] border-transparent hover:bg-gray-50'
                          : 'bg-gray-50/50 border-transparent opacity-40 hover:opacity-75'
                      }`}
                    >
                      {/* Top Day Number & Badges */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                            isToday
                              ? 'bg-[#006191] text-white shadow-2xs'
                              : isSelected
                              ? 'text-[#006191] font-extrabold'
                              : cell.isCurrentMonth
                              ? 'text-[#121c2a]'
                              : 'text-gray-400'
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {hasEvents && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#006191]/10 text-[#006191]">
                            {cell.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event Indicator Pills inside cell */}
                      <div className="w-full space-y-1 mt-1">
                        {cell.events.slice(0, 2).map((evt) => {
                          const style = CATEGORY_COLORS[evt.category];
                          return (
                            <div
                              key={evt.id}
                              className={`text-[9px] font-medium truncate px-1 py-0.5 rounded leading-tight flex items-center gap-1 ${style.bg} ${style.text}`}
                              title={`${evt.time} - ${evt.title}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`}></span>
                              <span className="truncate">{evt.title}</span>
                            </div>
                          );
                        })}
                        {cell.events.length > 2 && (
                          <p className="text-[9px] text-[#566771] font-semibold pl-1">
                            +{cell.events.length - 2} more
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-[11px] text-[#566771]">
                <span className="font-semibold text-[#121c2a]">Category Legend:</span>
                {Object.entries(CATEGORY_COLORS).map(([cat, style]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`}></span>
                    <span>{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Selected Day Inspector & Event Details (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Selected Day Header Card */}
              <div className="bg-[#eff3ff] p-5 rounded-2xl border border-[#d3e5f1] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#006191] uppercase tracking-wider">
                    Selected Schedule
                  </span>
                  <h4 className="text-lg font-bold text-[#121c2a]">
                    {formatEventDate(selectedDate, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-white text-[#006191] border border-[#bec7d2]/40 shadow-2xs">
                    {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Event' : 'Events'}
                  </span>
                </div>
              </div>

              {/* Event Cards for Selected Day */}
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map((evt) => {
                    const style = CATEGORY_COLORS[evt.category];
                    const percentFilled = evt.capacity
                      ? Math.min(100, Math.round(((evt.registeredCount || 0) / evt.capacity) * 100))
                      : 0;

                    return (
                      <div
                        key={evt.id}
                        className="bg-white rounded-2xl p-5 border border-[#bec7d2]/50 shadow-xs hover:shadow-md transition-all group relative overflow-hidden"
                      >
                        {/* Category Accent top border */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${style.dot}`}></div>

                        <div className="flex items-start justify-between gap-3 mb-2 pt-1">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                          >
                            {evt.category}
                          </span>

                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#566771]">
                            <Clock className="w-3.5 h-3.5 text-[#006191]" />
                            <span>{evt.time}</span>
                          </div>
                        </div>

                        <h5 className="text-base font-bold text-[#121c2a] group-hover:text-[#006191] transition-colors mb-2 leading-snug">
                          {evt.title}
                        </h5>

                        <p className="text-xs text-[#3f4850] line-clamp-2 leading-relaxed mb-4">
                          {evt.description}
                        </p>

                        <div className="space-y-1.5 mb-4 text-xs text-[#566771] bg-[#f9f9ff] p-3 rounded-xl border border-gray-100">
                          {evt.speaker && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#121c2a] shrink-0">Speaker:</span>
                              <span className="text-[#006191] font-medium truncate">{evt.speaker}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                          {evt.isOnline && (
                            <div className="flex items-center gap-2 text-emerald-700">
                              <Video className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-medium">Live Streamed / Hybrid Access Available</span>
                            </div>
                          )}
                        </div>

                        {/* Capacity meter */}
                        {evt.capacity && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-[11px] text-[#566771] mb-1">
                              <span>Attendance Registration:</span>
                              <span className="font-bold text-[#121c2a]">
                                {evt.registeredCount || 0} / {evt.capacity} seats ({percentFilled}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#006191] h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${percentFilled}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEventModal(evt)}
                            className="px-3.5 py-2 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Event Details &amp; RSVP</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={generateGoogleCalendarUrl(evt)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-[#566771] hover:text-[#006191] hover:bg-[#eff3ff] rounded-lg transition-colors cursor-pointer border border-[#bec7d2]/40"
                              title="Add to Google Calendar"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadIcsFile(evt)}
                              className="p-2 text-[#566771] hover:text-[#006191] hover:bg-[#eff3ff] rounded-lg transition-colors cursor-pointer border border-[#bec7d2]/40"
                              title="Download iCal file (.ics)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state when no events on this date */
                <div className="bg-white rounded-2xl p-8 border border-dashed border-[#bec7d2] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-[#6f7881] flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-[#121c2a] text-sm">
                    No Scheduled Events on this Day
                  </h5>
                  <p className="text-xs text-[#566771] max-w-xs mx-auto">
                    There are no registered sessions on this particular date. Select another day with an indicator dot, or check our upcoming agenda.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEvt = upcomingEvents.find((e) => e.date >= selectedDate);
                      if (nextEvt) {
                        setSelectedDate(nextEvt.date);
                      } else if (upcomingEvents.length > 0) {
                        setSelectedDate(upcomingEvents[0].date);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eff3ff] hover:bg-[#d3e5f1] text-[#006191] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span>Jump to Next Upcoming Event</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* AGENDA / LIST VIEW */
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-[#bec7d2]/40 flex items-center justify-between text-xs text-[#566771]">
              <span>
                Displaying <strong>{upcomingEvents.length}</strong> upcoming community programs and gatherings
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                className="text-[#006191] font-semibold hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-dashed border-[#bec7d2] text-center text-xs text-[#566771]">
                0 Events match your current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((evt) => {
                  const style = CATEGORY_COLORS[evt.category];
                  return (
                    <div
                      key={evt.id}
                      className="bg-white rounded-2xl overflow-hidden border border-[#bec7d2]/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                        <img
                          src={evt.imageUrl || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=800'}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs backdrop-blur-md ${style.bg} ${style.text} border ${style.border}`}
                          >
                            {evt.category}
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/75 text-white px-2.5 py-1 rounded-lg text-xs font-mono font-semibold backdrop-blur-xs flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-300" />
                          <span>{evt.time}</span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-[#006191] font-bold mb-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>
                              {formatEventDate(evt.date, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#121c2a] group-hover:text-[#006191] transition-colors leading-snug line-clamp-2">
                            {evt.title}
                          </h4>
                          <p className="text-xs text-[#3f4850] line-clamp-2 mt-1.5 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-[#566771]">
                          {evt.speaker && (
                            <p className="truncate">
                              <strong className="text-[#121c2a]">Speaker:</strong> {evt.speaker}
                            </p>
                          )}
                          <p className="truncate flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEventModal(evt)}
                            className="flex-1 py-2 bg-[#006191] hover:bg-[#007bb6] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>Details &amp; RSVP</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <a
                            href={generateGoogleCalendarUrl(evt)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-[#566771] hover:text-[#006191] hover:bg-[#eff3ff] rounded-xl transition-colors border border-[#bec7d2]/40"
                            title="Add to Google Calendar"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation Link to Full Programs */}
        <div className="mt-10 pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#566771]">
            <Sparkles className="w-4 h-4 text-[#006191]" />
            <span>All sessions are free and open to the public unless stated otherwise.</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/programs')}
            className="text-xs font-bold text-[#006191] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Explore Detailed Program Profiles &amp; Impact Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* EVENT DETAILS & RSVP MODAL */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-[#bec7d2]/60 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedEventModal(null)}
              className="absolute right-4 top-4 p-1.5 text-[#566771] hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  CATEGORY_COLORS[selectedEventModal.category].bg
                } ${CATEGORY_COLORS[selectedEventModal.category].text} ${
                  CATEGORY_COLORS[selectedEventModal.category].border
                }`}
              >
                {selectedEventModal.category}
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#121c2a] mb-2 leading-snug">
              {selectedEventModal.title}
            </h3>

            {/* Date & Time Highlights */}
            <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-[#f9f9ff] rounded-xl border border-[#bec7d2]/30 text-xs">
              <div>
                <span className="text-[#566771] block">Date:</span>
                <strong className="text-[#121c2a]">
                  {formatEventDate(selectedEventModal.date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </strong>
              </div>
              <div>
                <span className="text-[#566771] block">Time:</span>
                <strong className="text-[#006191]">{selectedEventModal.time}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#3f4850] leading-relaxed mb-6">
              <div>
                <h4 className="font-bold text-[#121c2a] uppercase text-[11px] mb-1">
                  Event Description &amp; Objectives
                </h4>
                <p>{selectedEventModal.description}</p>
              </div>

              {selectedEventModal.speaker && (
                <div className="p-3 bg-[#eff3ff] rounded-xl border border-[#d3e5f1]">
                  <strong className="block text-[#006191] mb-0.5">Presenter / Facilitator:</strong>
                  <p className="font-semibold text-[#121c2a]">{selectedEventModal.speaker}</p>
                </div>
              )}

              <div className="space-y-1">
                <strong className="block text-[#121c2a] text-[11px] uppercase">Venue &amp; Accessibility:</strong>
                <p className="flex items-center gap-1.5 text-[#566771]">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{selectedEventModal.location}</span>
                </p>
                {selectedEventModal.onlineLink && isSafeHttpUrl(selectedEventModal.onlineLink) && (
                  <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span>Hybrid link: </span>
                    <a
                      href={selectedEventModal.onlineLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline truncate"
                    >
                      {selectedEventModal.onlineLink}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  handleRsvp(selectedEventModal);
                  setSelectedEventModal(null);
                }}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Attendance (RSVP)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={generateGoogleCalendarUrl(selectedEventModal)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 bg-[#eff3ff] hover:bg-[#d3e5f1] text-[#006191] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-[#d3e5f1] cursor-pointer"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={() => downloadIcsFile(selectedEventModal)}
                  className="py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-[#3f4850] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-[#bec7d2]/40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
