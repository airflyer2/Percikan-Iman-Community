import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Globe,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X
} from 'lucide-react';
import {
  deleteEvent,
  formatFirestoreError,
  isValidFirestoreImageUrl,
  normalizeSafeHttpUrl,
  saveEvent,
  subscribeEvents,
  utf8ByteLength
} from '../../lib/firestoreContent';
import { isSafeHttpUrl } from '../../lib/urlValidation';
import { useLanguage } from '../../i18n';
import { CommunityEvent } from '../../types';
import { PhotoUpload } from '../PhotoUpload';

const EVENT_CATEGORIES: ReadonlyArray<CommunityEvent['category']> = [
  'Majelis & Spiritual',
  'Charity & Relief',
  'Youth & Education',
  'Community Gathering'
];

interface EventFormState {
  id: string;
  title: string;
  date: string;
  time: string;
  category: CommunityEvent['category'];
  location: string;
  speaker: string;
  description: string;
  isOnline: boolean;
  onlineLink: string;
  capacity: string;
  registeredCount: string;
  featured: boolean;
  regularFee: string;
  memberSubsidizedFee: string;
  imageUrl: string;
}

function formatLocalIsoDate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyEventForm(): EventFormState {
  return {
    id: `evt-${Date.now()}`,
    title: '',
    date: formatLocalIsoDate(),
    time: '09:00 - 12:00 CET',
    category: 'Majelis & Spiritual',
    location: 'Percikan Iman Community Center, Zurich',
    speaker: '',
    description: '',
    isOnline: false,
    onlineLink: '',
    capacity: '150',
    registeredCount: '0',
    featured: false,
    regularFee: '0',
    memberSubsidizedFee: '0',
    imageUrl: ''
  };
}

function validateSafeHttpLink(raw: string): string | null {
  const normalized = normalizeSafeHttpUrl(raw);
  if (!normalized) return null;
  const bytes = utf8ByteLength(normalized);
  if (
    !isSafeHttpUrl(normalized) ||
    bytes < 8 ||
    bytes > 2048 ||
    /\s/.test(normalized)
  ) {
    return 'URL must start with http:// or https://, be 8–2048 bytes, and contain no spaces or embedded credentials.';
  }
  return null;
}

function validateOptionalEventImage(raw: string): string | null {
  const normalized = normalizeSafeHttpUrl(raw);
  if (!normalized) return null;
  if (normalized.startsWith('data:')) {
    if (!isValidFirestoreImageUrl(normalized)) {
      return 'Uploaded image must be a raster PNG, JPEG, WEBP, or GIF under 500 KB (SVG is not supported).';
    }
    return null;
  }
  return validateSafeHttpLink(normalized);
}

export const AdminEventsTab: React.FC = () => {
  const { t } = useLanguage();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(createEmptyEventForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const scheduleStatusClear = () => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
      statusTimerRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    const unsub = subscribeEvents((res) => {
      setEvents(res.data);
      setLoading(res.loading);
      setLoadError(res.error);
    });
    return () => {
      unsub();
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      const matchesCat = filterCategory === 'All' || evt.category === filterCategory;
      const matchesQuery =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q) ||
        (evt.speaker || '').toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [events, searchQuery, filterCategory]);

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setForm(createEmptyEventForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: CommunityEvent) => {
    setEditingEventId(evt.id);
    setForm({
      id: evt.id,
      title: evt.title,
      date: evt.date,
      time: evt.time,
      category: evt.category,
      location: evt.location,
      speaker: evt.speaker || '',
      description: evt.description || '',
      isOnline: Boolean(evt.isOnline),
      onlineLink: evt.onlineLink || '',
      capacity: evt.capacity !== undefined ? String(evt.capacity) : '',
      registeredCount: evt.registeredCount !== undefined ? String(evt.registeredCount) : '0',
      featured: Boolean(evt.featured),
      regularFee: evt.regularFee !== undefined ? String(evt.regularFee) : '0',
      memberSubsidizedFee:
        evt.memberSubsidizedFee !== undefined ? String(evt.memberSubsidizedFee) : '0',
      imageUrl: evt.imageUrl || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    setFormError(null);

    if (!form.title.trim() || !form.date.trim() || !form.time.trim() || !form.location.trim()) {
      setFormError('Title, date, time, and location are required.');
      return;
    }

    if (form.onlineLink.trim()) {
      const linkErr = validateSafeHttpLink(form.onlineLink);
      if (linkErr) {
        setFormError(`Online Link: ${linkErr}`);
        return;
      }
    }

    if (form.imageUrl.trim()) {
      const imgErr = validateOptionalEventImage(form.imageUrl);
      if (imgErr) {
        setFormError(`Cover Image: ${imgErr}`);
        return;
      }
    }

    let parsedCapacity: number | undefined;
    if (form.capacity.trim() !== '') {
      const numCap = Number(form.capacity);
      if (!Number.isFinite(numCap) || numCap < 1 || numCap > 100_000) {
        setFormError('Capacity must be between 1 and 100,000 (or leave blank for unlimited).');
        return;
      }
      parsedCapacity = Math.trunc(numCap);
    }

    let parsedRegistered: number | undefined;
    if (form.registeredCount.trim() !== '') {
      const numReg = Number(form.registeredCount);
      if (!Number.isFinite(numReg) || numReg < 0 || numReg > 100_000) {
        setFormError('Registered count must be between 0 and 100,000.');
        return;
      }
      parsedRegistered = Math.trunc(numReg);
    }

    let parsedRegularFee: number | undefined;
    if (form.regularFee.trim() !== '') {
      const numFee = Number(form.regularFee);
      if (!Number.isFinite(numFee) || numFee < 0 || numFee > 10_000) {
        setFormError('Regular fee (CHF) must be between 0 and 10,000.');
        return;
      }
      parsedRegularFee = numFee;
    }

    let parsedMemberFee: number | undefined;
    if (form.memberSubsidizedFee.trim() !== '') {
      const numMemFee = Number(form.memberSubsidizedFee);
      if (!Number.isFinite(numMemFee) || numMemFee < 0 || numMemFee > 10_000) {
        setFormError('Member subsidized fee (CHF) must be between 0 and 10,000.');
        return;
      }
      parsedMemberFee = numMemFee;
    }

    const payload: CommunityEvent = {
      id: editingEventId || form.id || `evt-${Date.now()}`,
      title: form.title.trim(),
      date: form.date.trim(),
      time: form.time.trim(),
      category: form.category,
      location: form.location.trim(),
      description: form.description.trim(),
      isOnline: form.isOnline,
      onlineLink: form.onlineLink.trim() ? normalizeSafeHttpUrl(form.onlineLink) : undefined,
      speaker: form.speaker.trim() || undefined,
      capacity: parsedCapacity,
      registeredCount: parsedRegistered,
      featured: form.featured,
      regularFee: parsedRegularFee,
      memberSubsidizedFee: parsedMemberFee,
      imageUrl: form.imageUrl.trim() ? normalizeSafeHttpUrl(form.imageUrl) : undefined
    };

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveEvent(payload);
      setIsModalOpen(false);
      setStatusMessage(
        editingEventId
          ? `Event "${payload.title}" updated in Firestore.`
          : `Event "${payload.title}" published to Firestore.`
      );
      scheduleStatusClear();
    } catch (err) {
      setFormError(formatFirestoreError(err, 'Failed to save community event.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (evt: CommunityEvent) => {
    if (isSavingRef.current) return;
    if (!window.confirm(`Delete event "${evt.title}" (${evt.date}) permanently?`)) {
      return;
    }

    setActionError(null);
    isSavingRef.current = true;
    try {
      await deleteEvent(evt.id);
      setStatusMessage(`Deleted event "${evt.title}".`);
      scheduleStatusClear();
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete event.'));
    } finally {
      isSavingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#121c2a]">{t.admin.tabEvents}</h2>
            <p className="text-xs text-[#566771] mt-0.5">
              Manage community calendar events, Zoom links, capacities, and CHF pricing in Cloud Firestore.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#006191] text-white rounded-xl text-xs font-bold hover:bg-[#007bb6] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-[#e6eeff]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, speaker, or venue..."
              className="w-full pl-9 pr-4 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
            />
            <Search className="w-4 h-4 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['All', ...EVENT_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-[#006191] text-white'
                    : 'bg-[#f2f6fc] text-[#3f4850] hover:bg-[#e1ecf8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
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

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-12 text-center text-xs text-[#566771]">
          <div className="w-7 h-7 border-3 border-[#006191] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Loading community events from Firestore...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#bec7d2] p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-[#6f7881] mx-auto opacity-60" />
          <h3 className="text-base font-bold text-[#121c2a]">No Events Found</h3>
          <p className="text-xs text-[#566771] max-w-md mx-auto">
            {events.length === 0
              ? 'No events are stored in Firestore yet. Create an event or run initial bootstrap if needed.'
              : 'No events match your active search or category filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((evt) => (
            <article
              key={evt.id}
              className="bg-white rounded-2xl border border-[#bec7d2]/60 overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                {evt.imageUrl && (
                  <div className="h-40 w-full bg-[#eff3ff] overflow-hidden border-b border-[#e6eeff]">
                    <img
                      src={evt.imageUrl}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#eff3ff] text-[#006191] text-[10px] font-bold uppercase tracking-wider">
                      {evt.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {evt.featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                          <Star className="w-3 h-3" /> Featured
                        </span>
                      )}
                      {evt.isOnline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <Globe className="w-3 h-3" /> Online
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-[#121c2a] leading-snug">{evt.title}</h3>

                  <div className="space-y-1 text-xs text-[#566771]">
                    <p className="flex items-center gap-1.5 font-semibold text-[#121c2a]">
                      <Calendar className="w-3.5 h-3.5 text-[#006191]" />
                      <span>{evt.date}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#006191]" />
                      <span>{evt.time}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#006191] shrink-0" />
                      <span className="line-clamp-1">{evt.location}</span>
                    </p>
                  </div>

                  <p className="text-xs text-[#3f4850] line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="pt-2 border-t border-[#eef2f0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#566771]">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-[#006191]" />
                      {evt.registeredCount ?? 0}
                      {evt.capacity ? ` / ${evt.capacity} seats` : ' registered'}
                    </span>
                    <span className="font-bold text-[#121c2a]">
                      CHF {evt.memberSubsidizedFee ?? 0} member / CHF {evt.regularFee ?? 0} regular
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-[#f9f9ff] border-t border-[#e6eeff] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#6f7881] truncate max-w-[160px]">
                  {evt.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(evt)}
                    className="p-1.5 text-[#006191] hover:bg-white rounded-md transition-colors cursor-pointer"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(evt)}
                    className="p-1.5 text-[#ba1a1a] hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Event Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-event-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6eeff] mb-5">
              <h3 id="admin-event-modal-title" className="text-lg font-bold text-[#121c2a]">
                {editingEventId ? 'Edit Community Event' : 'Create Community Event'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[#566771] hover:bg-gray-100 cursor-pointer"
                aria-label="Close event modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#121c2a] uppercase mb-1">
                  Event Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Kajian Akbar Menyambut Ramadhan"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg text-sm font-semibold outline-none focus:border-[#006191]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Time Window *
                  </label>
                  <input
                    name="time"
                    type="text"
                    required
                    maxLength={100}
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    placeholder="08:30 - 11:30 CET"
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as CommunityEvent['category'] })
                    }
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg bg-white outline-none focus:border-[#006191]"
                  >
                    {EVENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Location / Venue *
                  </label>
                  <input
                    name="location"
                    type="text"
                    required
                    maxLength={250}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Percikan Iman Center, Zurich"
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Speaker / Leader
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={form.speaker}
                    onChange={(e) => setForm({ ...form, speaker: e.target.value })}
                    placeholder="Dr. H. Aam Amiruddin"
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#f9f9ff] rounded-xl border border-[#e6eeff]">
                <label className="flex items-center gap-2 font-semibold text-[#121c2a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOnline}
                    onChange={(e) => setForm({ ...form, isOnline: e.target.checked })}
                    className="w-4 h-4 text-[#006191] rounded border-[#bec7d2]"
                  />
                  <span>Includes Online Stream / Hybrid Link</span>
                </label>

                <label className="flex items-center gap-2 font-semibold text-[#121c2a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 text-[#006191] rounded border-[#bec7d2]"
                  />
                  <span>Mark as Featured Event</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-[#121c2a] uppercase mb-1">
                  Online Meeting / Stream URL (HTTP/HTTPS only)
                </label>
                <input
                  name="onlineLink"
                  type="url"
                  value={form.onlineLink}
                  onChange={(e) => setForm({ ...form, onlineLink: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Capacity (≥ 1)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Registered
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={form.registeredCount}
                    onChange={(e) => setForm({ ...form, registeredCount: e.target.value })}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Regular Fee (CHF)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step="0.5"
                    value={form.regularFee}
                    onChange={(e) => setForm({ ...form, regularFee: e.target.value })}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] uppercase mb-1">
                    Member Fee (CHF)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step="0.5"
                    value={form.memberSubsidizedFee}
                    onChange={(e) => setForm({ ...form, memberSubsidizedFee: e.target.value })}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <PhotoUpload
                  id="admin-event-photo-upload"
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                  label="Event Poster / Cover Photo"
                  sublabel="Upload a raster PNG/JPEG/WEBP/GIF under 500 KB or paste an HTTP(S) image URL below"
                  aspectRatio="video"
                  allowUrlInput={false}
                />
                <div>
                  <label className="block font-bold text-[#566771] uppercase mb-1">
                    Or Cover Image URL (HTTP/HTTPS)
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#121c2a] uppercase mb-1">
                  Description &amp; Agenda
                </label>
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the agenda, target audience, and preparation notes..."
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#bec7d2] rounded-lg font-semibold text-[#566771] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#006191] hover:bg-[#007bb6] text-white font-bold rounded-lg shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingEventId
                    ? 'Save Event Changes'
                    : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
