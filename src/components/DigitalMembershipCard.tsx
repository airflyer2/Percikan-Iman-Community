import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  UserAccount,
  MembershipCategory,
  MembershipStatus
} from '../types';
import {
  QrCode,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Users,
  UserCheck,
  Sparkles,
  RefreshCw,
  Copy,
  Calendar,
  CreditCard,
  X,
  Volume2,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Clock,
  AlertTriangle,
  AlertCircle,
  Banknote
} from 'lucide-react';

interface DigitalMembershipCardProps {
  user: UserAccount;
  onOpenStatuten?: () => void;
}

export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  user,
  onOpenStatuten
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isScannerSimOpen, setIsScannerSimOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [simulatedCheckinTime, setSimulatedCheckinTime] = useState<string | null>(null);

  // Compute stable serialized child names to avoid unnecessary updates
  const childrenSerialized = (user.children || [])
    .map((c) => c.name)
    .filter(Boolean)
    .join('|');

  // Selected party for family check-ins
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>(() => {
    const list = [user.name];
    if (user.spouse?.name) list.push(user.spouse.name);
    if (user.children && user.children.length > 0) {
      user.children.forEach((c) => {
        if (c.name) list.push(c.name);
      });
    }
    return list;
  });

  // Keep selected family members updated only when identity changes
  useEffect(() => {
    const list = [user.name];
    if (user.spouse?.name) list.push(user.spouse.name);
    if (user.children && user.children.length > 0) {
      user.children.forEach((c) => {
        if (c.name) list.push(c.name);
      });
    }
    setSelectedFamilyMembers(list);
  }, [user.name, user.spouse?.name, childrenSerialized]);

  const memberCode = user.memberCode || `PI-${user.membershipYear || 2026}-CH-${Math.abs(
    (user.email || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  ).toString().slice(0, 4)}`;

  const isFamily = user.membershipCategory === 'family';
  const isFeeExempt = Boolean(user.feeExemption?.isExempt);
  const isActive = user.membershipStatus === 'active';
  const isPending = user.membershipStatus === 'pending_payment';
  const isSimCheckinAllowed = isActive || isFeeExempt;

  // Toggle family attendee
  const toggleAttendee = (name: string) => {
    // Primary user is always included
    if (name === user.name) return;
    setSelectedFamilyMembers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Generate stable check-in payload for the QR code (memoized, NO Date.now() to prevent infinite re-renders)
  const partySerialized = selectedFamilyMembers.join('|');
  const checkinPayload = useMemo(() => {
    return JSON.stringify({
      org: 'Verein Percikan Iman Schweiz',
      memberId: memberCode,
      name: user.name,
      category: user.membershipCategory || 'personal',
      status: user.membershipStatus || 'active',
      exempt: isFeeExempt,
      validYear: user.membershipYear || 2026,
      validUntil: '2026-12-31',
      partyCount: selectedFamilyMembers.length,
      party: selectedFamilyMembers,
      authHash: btoa(`${memberCode}:${user.name}:2026-CH`).slice(0, 16)
    });
  }, [
    memberCode,
    user.name,
    user.membershipCategory,
    user.membershipStatus,
    isFeeExempt,
    user.membershipYear,
    partySerialized
  ]);

  // Generate QR Code image stably with cancellation guard
  useEffect(() => {
    let isCancelled = false;

    QRCode.toDataURL(checkinPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#00263d',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to generate QR code:', err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [checkinPayload]);

  // Audio chime generator for simulated check-in using Web Audio API
  const playCheckinChime = (isSuccess: boolean = true) => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      if (isSuccess) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.12);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio playback fails silently if restricted
    }
  };

  const handleSimulateCheckin = () => {
    playCheckinChime(isSimCheckinAllowed);
    const now = new Date();
    const timeStr = `${now.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })} um ${now.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} Uhr`;
    setSimulatedCheckinTime(timeStr);
    setIsScannerSimOpen(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(memberCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Download digital card as PNG
  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
    };

    // Background Gradient (Deep Swiss Sapphire)
    const gradient = ctx.createLinearGradient(0, 0, 1000, 630);
    gradient.addColorStop(0, '#002b42');
    gradient.addColorStop(0.5, '#00476d');
    gradient.addColorStop(1, '#001c2e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    drawRoundRect(0, 0, 1000, 630, 32);
    ctx.fill();

    // Decorative Gold border
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 4;
    ctx.beginPath();
    drawRoundRect(16, 16, 968, 598, 24);
    ctx.stroke();

    // Subtle header accent line
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(40, 110, 920, 2);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Noto Sans", sans-serif';
    ctx.fillText('VEREIN PERCIKAN IMAN SCHWEIZ', 110, 75);

    ctx.font = '16px "Noto Sans", sans-serif';
    ctx.fillStyle = '#9fd2ff';
    ctx.fillText('OFFIZIELLER DIGITALER MITGLIEDSAUSWEIS • ART. 60–79 ZGB', 110, 98);

    // Swiss Flag emblem
    ctx.fillStyle = '#d52b1e';
    ctx.beginPath();
    drawRoundRect(42, 52, 52, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    // Cross
    ctx.fillRect(63, 60, 10, 24);
    ctx.fillRect(54, 67, 28, 10);

    // Member Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Noto Sans", sans-serif';
    ctx.fillText(user.name.toUpperCase(), 45, 185);

    // Member Code
    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`MITGLIEDS-NR: ${memberCode}`, 45, 225);

    // Status & Category
    ctx.fillStyle = '#e2f1ff';
    ctx.font = '20px "Noto Sans", sans-serif';
    const catLabel = isFamily ? 'Kategorie: Familienmitgliedschaft (CHF 120/Jahr)' : 'Kategorie: Einzelmitgliedschaft (CHF 80/Jahr)';
    ctx.fillText(catLabel, 45, 275);

    ctx.fillText(`Gültig bis: 31. Dezember 2026 (Generalversammlung)`, 45, 310);

    if (isFeeExempt) {
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('Status: GV-Beitragsbefreit (100% Subventioniert)', 45, 345);
    } else if (user.membershipStatus === 'pending_payment') {
      ctx.fillStyle = '#fde047';
      ctx.fillText('Status: Ausstehend • Jahresbeitrag noch offen', 45, 345);
    } else {
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`Status: ${isActive ? 'Aktiv • Ordentliches Mitglied' : 'In Überprüfung'}`, 45, 345);
    }

    // Admitted Family List
    if (isFamily && selectedFamilyMembers.length > 1) {
      ctx.fillStyle = '#d3e5f1';
      ctx.font = '16px "Noto Sans", sans-serif';
      ctx.fillText(`Angemeldete Familie (${selectedFamilyMembers.length} Personen):`, 45, 405);
      const partyText = selectedFamilyMembers.join(' • ');
      ctx.fillText(partyText.length > 55 ? partyText.slice(0, 52) + '...' : partyText, 45, 435);
    }

    // Footnote
    ctx.fillStyle = '#8398a6';
    ctx.font = '14px "Noto Sans", sans-serif';
    ctx.fillText('Dieser digitale Ausweis berechtigt zum vergünstigten / kostenlosen Einlass bei Vereinsevents.', 45, 570);
    ctx.fillText('Zürich, Schweiz • www.percikaniman.org', 45, 592);

    // Draw QR Code
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        // Draw white backing for QR
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        drawRoundRect(680, 160, 260, 260, 18);
        ctx.fill();
        ctx.drawImage(qrImg, 690, 170, 240, 240);

        ctx.fillStyle = '#c5a059';
        ctx.font = 'bold 15px "Noto Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EVENT QUICK CHECK-IN', 810, 455);
        ctx.textAlign = 'left';

        // Trigger download
        const link = document.createElement('a');
        link.download = `Verein-PI-Mitgliedsausweis-${memberCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      qrImg.src = qrDataUrl;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-5 sm:p-6 shadow-xs space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#bec7d2]/40 pb-4 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#006191] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <QrCode className="w-3 h-3 text-sky-200" />
              Digitaler Mitgliedsausweis
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Event Check-in Bereit
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#121c2a]">
            Digitaler Mitgliedsausweis &amp; Schnell-Check-in
          </h3>
          <p className="text-xs text-[#566771] max-w-2xl leading-relaxed">
            Zeigen Sie diesen QR-Code am Einlass von Verein-Veranstaltungen (z.B. Familienlager, monatliches Pengajian,
            Ramadan-Iftar, Youth Workshop) für den <strong>sofortigen, vergünstigten oder kostenlosen Einlass</strong> vor.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsFullscreenModalOpen(true)}
            className="px-3.5 py-2 bg-[#006191] hover:bg-[#007bb6] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Auf Vollbild vergrössern für Scanner am Einlass"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Für Einlass vergrössern</span>
          </button>
          
          <button
            type="button"
            onClick={handleSimulateCheckin}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Check-in Scan testen"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Scan testen</span>
          </button>
        </div>
      </div>

      {/* Pending Fee Settlement Warning */}
      {user.membershipStatus === 'pending_payment' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Annual Membership Contribution Pending Settlement</p>
              <p className="text-[11px] text-amber-800">
                Your account is currently in <em>Pending Payment</em> status. Full benefits and official active standing will be activated upon fee confirmation (via TWINT, PostFinance transfer, or Cash to an administrator).
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-lg shrink-0 self-start sm:self-center">
            Pending Payment
          </span>
        </div>
      )}

      {/* CARD PRESENTATION & ATTENDEE PICKER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER: THE PHYSICAL-LOOKING DIGITAL PASS */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Card Wrapper with perspective */}
          <div className="w-full max-w-md perspective-1000">
            <div
              className={`relative w-full rounded-2xl transition-transform duration-500 transform-style-preserve-3d shadow-xl overflow-hidden border border-amber-400/30 ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                minHeight: '260px',
                background: 'linear-gradient(135deg, #002b42 0%, #004d77 50%, #001f33 100%)'
              }}
            >
              {/* Gold Security Watermark Pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Card Front */}
              {!isFlipped ? (
                <div className="p-5 sm:p-6 text-white flex flex-col justify-between h-full relative z-10 space-y-4">
                  {/* Top Bar: Association Info & Swiss Seal */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Swiss Flag Badge */}
                      <div className="w-8 h-8 rounded-lg bg-[#d52b1e] border border-white/40 flex items-center justify-center shadow-xs shrink-0">
                        <div className="relative w-4 h-4">
                          <div className="absolute inset-x-1.5 top-0 bottom-0 bg-white rounded-xs"></div>
                          <div className="absolute inset-y-1.5 left-0 right-0 bg-white rounded-xs"></div>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-[#c5a059] uppercase block">
                          VEREIN PERCIKAN IMAN SCHWEIZ
                        </span>
                        <span className="text-[11px] font-medium text-sky-200">
                          Digital Member Pass • Art. 60–79 ZGB
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-amber-300/30 flex items-center gap-1 backdrop-blur-xs">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      {user.membershipYear || 2026}
                    </span>
                  </div>

                  {/* Middle Content: Member Details + QR Code Side-by-Side */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <span className="text-[9px] uppercase tracking-wider text-sky-200/80 font-bold block">
                        Mitgliedsname / Name
                      </span>
                      <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-wide truncate">
                        {user.name}
                      </h4>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-xs font-mono font-bold text-amber-300 bg-black/25 px-2 py-0.5 rounded border border-amber-400/20">
                          {memberCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="text-sky-300 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title="Code kopieren"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 bg-sky-900/60 rounded-md border border-sky-400/30 font-medium text-sky-100 flex items-center gap-1">
                          {isFamily ? <Users className="w-3 h-3 text-sky-300" /> : <UserCheck className="w-3 h-3 text-sky-300" />}
                          {isFamily ? 'Familien-Tarif' : 'Einzel-Tarif'}
                        </span>
                        {user.membershipStatus === 'pending_payment' ? (
                          <span className="px-2 py-0.5 bg-amber-400 text-black font-bold rounded-md border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3 h-3 text-black" />
                            Fee Pending
                          </span>
                        ) : isFeeExempt ? (
                          <span className="px-2 py-0.5 bg-emerald-900/60 rounded-md border border-emerald-400/30 font-semibold text-emerald-200">
                            GV-Befreit (CHF 0)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* QR Code Container (Click to expand) */}
                    <div
                      onClick={() => setIsFullscreenModalOpen(true)}
                      className="bg-white p-2 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform shrink-0 border border-white/60 text-center group"
                      title="Klicken zum Vergrössern"
                    >
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Check-in QR Code"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-md"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                          <QrCode className="w-8 h-8 animate-spin" />
                        </div>
                      )}
                      <span className="text-[9px] font-bold text-[#006191] group-hover:underline flex items-center justify-center gap-0.5 mt-1">
                        <Maximize2 className="w-2.5 h-2.5" />
                        Vergrössern
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Footer: Validity, Party Count, Card Flip Button */}
                  <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-sky-200">
                    <div>
                      <span className="text-sky-300/80 text-[9px] uppercase tracking-wider block">Gültigkeitsdauer</span>
                      <span className="font-semibold text-white">Bis 31. Dez {user.membershipYear || 2026}</span>
                    </div>

                    {isFamily && (
                      <div className="text-center">
                        <span className="text-sky-300/80 text-[9px] uppercase tracking-wider block">Einlass-Party</span>
                        <span className="font-bold text-amber-300">{selectedFamilyMembers.length} Pers. angemeldet</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-white/20"
                    >
                      <RefreshCw className="w-3 h-3 text-sky-200" />
                      <span>Rückseite</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Back */
                <div className="p-5 sm:p-6 text-white flex flex-col justify-between h-full relative z-10 space-y-4">
                  <div>
                    {/* Magnetic Stripe representation */}
                    <div className="w-full h-8 bg-black/80 rounded mb-3"></div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-sky-200 text-[11px] border-b border-white/10 pb-1">
                        <span>Vereinsregister: Art. 60 ff. ZGB</span>
                        <span className="font-mono">CH-020.6.002.418</span>
                      </div>
                      <p className="text-[11px] text-sky-100/90 leading-relaxed">
                        Dieser Ausweis ist personengebunden und berechtigt zur Teilnahme an Vereinsveranstaltungen
                        zu den statutengemäss vergünstigten Konditionen.
                      </p>
                      <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-[10px] text-sky-200 space-y-0.5">
                        <p><strong>Geschäftsstelle:</strong> Zürich, Schweiz</p>
                        <p><strong>Kontakt:</strong> info@percikaniman.org</p>
                        <p><strong>Instagram:</strong> @verein.pi</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/15">
                    {onOpenStatuten && (
                      <button
                        type="button"
                        onClick={onOpenStatuten}
                        className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                      >
                        Statuten einsehen
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsFlipped(false)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-white/20 ml-auto"
                    >
                      <RefreshCw className="w-3 h-3 text-sky-200" />
                      <span>Vorderseite</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Helper under Card */}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#566771]">
            <button
              type="button"
              onClick={handleDownloadCard}
              className="inline-flex items-center gap-1 text-[#006191] hover:underline font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ausweis als Bild speichern (PNG)</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 text-[#566771] hover:text-[#121c2a] font-medium cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? 'Kopiert!' : 'Code kopieren'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: EVENT CHECK-IN PARTY CONFIGURATOR & SCANNER TEST */}
        <div className="lg:col-span-5 space-y-4">
          {/* Family Check-in Selector */}
          <div className="bg-[#f9f9ff] p-4 rounded-xl border border-[#bec7d2]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#006191]" />
                <h4 className="text-xs font-bold text-[#121c2a] uppercase tracking-wider">
                  {isFamily ? 'Familien-Check-in Teilnehmer' : 'Check-in Teilnehmer'}
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#eff3ff] text-[#006191] rounded-full">
                {selectedFamilyMembers.length} {selectedFamilyMembers.length === 1 ? 'Person' : 'Personen'} ausgewählt
              </span>
            </div>

            <p className="text-[11px] text-[#566771] leading-relaxed">
              {isFamily
                ? 'Wählen Sie aus, welche Familienmitglieder Sie zu diesem Event begleiten. Der QR-Code aktualisiert sich sofort für den Einlass.'
                : 'Ihr persönlicher Mitgliedspass ist für Sie als Einzelmitglied ausgestellt.'}
            </p>

            {/* List of checkable members */}
            <div className="space-y-1.5">
              {/* Primary Member (always checked) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#bec7d2]/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#006191] text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-[#121c2a]">{user.name}</span>
                    <span className="text-[10px] text-[#566771] ml-1.5">(Hauptmitglied)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  CHF 0 (Gratis)
                </span>
              </div>

              {/* Spouse (if present) */}
              {user.spouse?.name && (
                <div
                  onClick={() => toggleAttendee(user.spouse!.name)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedFamilyMembers.includes(user.spouse.name)
                      ? 'bg-white border-[#006191]/50 text-[#121c2a]'
                      : 'bg-gray-50 border-gray-200 text-gray-400 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center ${
                        selectedFamilyMembers.includes(user.spouse.name)
                          ? 'bg-[#006191] text-white'
                          : 'border border-gray-300 bg-white'
                      }`}
                    >
                      {selectedFamilyMembers.includes(user.spouse.name) && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-semibold">{user.spouse.name}</span>
                      <span className="text-[10px] text-[#566771] ml-1.5">(Partner/in)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    CHF 0 (Familientarif)
                  </span>
                </div>
              )}

              {/* Children (if present) */}
              {user.children && user.children.length > 0 && (
                <>
                  {user.children.map((child) => {
                    const isSelected = selectedFamilyMembers.includes(child.name);
                    return (
                      <div
                        key={child.id}
                        onClick={() => toggleAttendee(child.name)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-white border-[#006191]/50 text-[#121c2a]'
                            : 'bg-gray-50 border-gray-200 text-gray-400 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#006191] text-white'
                                : 'border border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="font-semibold">{child.name}</span>
                            <span className="text-[10px] text-[#566771] ml-1.5">
                              ({child.relation || 'Kind'}{child.birthYear ? `, Jg. ${child.birthYear}` : ''})
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          CHF 0 (Kinder)
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {isFamily && (!user.children || user.children.length === 0) && !user.spouse?.name && (
              <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                Tipp: Sie haben die Familienmitgliedschaft aktiv. Fügen Sie unten im Profil Ihren Partner oder Kinder hinzu,
                damit diese automatisch auf dem Ausweis erscheinen.
              </p>
            )}
          </div>

          {/* Quick Info Box: Subsidized rate guarantee */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garantierter Mitglieder-Rabatt</span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Als ordentliches Mitglied geniessen Sie und Ihre angemeldeten Familienmitglieder 
              <strong> 100% kostenlosen oder stark subventionierten Zugang</strong> zu allen Percikan Iman Schweiz Veranstaltungen.
            </p>
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 pt-1 border-t border-emerald-200/60">
              <span>Nicht-Mitglieder: ca. CHF 20–35</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">Ihr Tarif: CHF 0.–</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: FULLSCREEN PRESENTATION MODE FOR EVENT CHECK-IN DESK */}
      {isFullscreenModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsFullscreenModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative border-4 border-[#006191]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#006191] uppercase tracking-widest block">
                VEREIN PERCIKAN IMAN SCHWEIZ
              </span>
              <h3 className="text-lg font-bold text-[#121c2a]">Event Einlass-Scan</h3>
              <p className="text-xs text-[#566771]">
                Halten Sie diesen Bildschirm vor den Scanner oder das Smartphone des Helferteams.
              </p>
            </div>

            {/* HIGH-CONTRAST LARGE QR CODE */}
            <div className="bg-white p-3 rounded-2xl border-2 border-gray-200 inline-block shadow-md">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Full Checkin QR Code"
                  className="w-64 h-64 mx-auto object-contain"
                />
              )}
            </div>

            {/* Member Details in high legibility */}
            <div className="bg-[#f2f6fc] p-3 rounded-xl text-left space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#566771]">Mitglied:</span>
                <span className="font-bold text-[#121c2a]">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#566771]">Mitglieds-Nr:</span>
                <span className="font-mono font-bold text-[#006191]">{memberCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#566771]">Gültig bis:</span>
                <span className="font-semibold text-emerald-700">31.12.2026</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#bec7d2]/40 pt-1">
                <span className="text-[#566771]">Angemeldete Personen:</span>
                <span className="font-bold text-[#006191]">{selectedFamilyMembers.length} Person(en)</span>
              </div>
            </div>

            {/* Test Scan Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenModalOpen(false);
                  handleSimulateCheckin();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Scan-Ergebnis simulieren</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SCANNER SIMULATOR (WHAT VOLUNTEERS SEE AT ENTRANCE) */}
      {isScannerSimOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsScannerSimOpen(false)}
        >
          <div
            className={`bg-white rounded-3xl max-w-md w-full p-6 text-left space-y-4 shadow-2xl relative border-2 ${
              isSimCheckinAllowed
                ? 'border-emerald-500'
                : isPending
                ? 'border-amber-500'
                : 'border-red-500'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsScannerSimOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Volunteer Scanner Banner */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSimCheckinAllowed
                    ? 'bg-emerald-100 text-emerald-700'
                    : isPending
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isSimCheckinAllowed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
                ) : isPending ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />
                ) : (
                  <X className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSimCheckinAllowed
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Einlass Scanner Terminal v2.4
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {isSimCheckinAllowed ? 'Audio-Chime ✓' : 'Warnsignal ⚠️'}
                  </span>
                </div>
                <h3
                  className={`text-base font-bold ${
                    isSimCheckinAllowed
                      ? 'text-emerald-950'
                      : isPending
                      ? 'text-amber-950'
                      : 'text-red-950'
                  }`}
                >
                  {isSimCheckinAllowed
                    ? 'Einlass Genehmigt • Gültiges Mitglied'
                    : isPending
                    ? 'Einlass Vorläufig Gesperrt • Beitrag offen'
                    : 'Einlass Verweigert • Nicht Aktiv'}
                </h3>
              </div>
            </div>

            {/* Verified Details */}
            <div
              className={`space-y-2.5 p-4 rounded-2xl border text-xs ${
                isSimCheckinAllowed
                  ? 'bg-emerald-50/50 border-emerald-200/80'
                  : isPending
                  ? 'bg-amber-50/70 border-amber-200/90'
                  : 'bg-red-50/70 border-red-200/90'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Mitglied:</span>
                <span className="font-bold text-[#121c2a] text-sm">{user.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Mitglieds-Nr:</span>
                <span className="font-mono font-bold text-[#006191]">{memberCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Status &amp; Tarif:</span>
                <span className="font-semibold text-gray-800">
                  {isFamily ? 'Familienmitglied (CHF 120/Jahr)' : 'Einzelmitglied (CHF 80/Jahr)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">
                  {isPending ? 'Offener Jahresbeitrag:' : 'Event-Gebühr:'}
                </span>
                <span
                  className={`font-extrabold px-2 py-0.5 rounded border ${
                    isSimCheckinAllowed
                      ? 'text-emerald-700 bg-white border-emerald-300'
                      : isPending
                      ? 'text-amber-900 bg-white border-amber-300'
                      : 'text-red-800 bg-white border-red-300'
                  }`}
                >
                  {isSimCheckinAllowed
                    ? 'CHF 0.00 (Vollständig Subventioniert)'
                    : isPending
                    ? `CHF ${isFamily ? '120.00' : '80.00'} (Ausstehend)`
                    : 'Nicht zugelassen'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Scan-Zeit:</span>
                <span className="font-mono text-[11px] text-gray-700">{simulatedCheckinTime}</span>
              </div>
            </div>

            {/* Explainer for Pending / Inactive */}
            {isPending && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
                  Jahresbeitrag vor Einlass begleichen:
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Mitglieder mit ausstehendem Jahresbeitrag (CHF {isFamily ? '120' : '80'}) werden am Eingang abgewiesen, bis der Beitrag per TWINT, Banküberweisung oder bar an der Kasse beim Einlass-Team beglichen wurde.
                </p>
              </div>
            )}

            {!isActive && !isPending && !isFeeExempt && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                <p className="font-bold">Mitgliedschaft nicht aktiv:</p>
                <p className="text-[11px] text-red-800 mt-0.5">
                  Ihr Mitgliedschaftsstatus ist derzeit &ldquo;{user.membershipStatus}&rdquo;. Bitte wenden Sie sich an den Vereinsvorstand (info@percikaniman.ch).
                </p>
              </div>
            )}

            {/* Admitted Party Roster */}
            <div>
              <h4 className="text-xs font-bold text-[#121c2a] uppercase tracking-wider mb-2">
                {isSimCheckinAllowed ? 'Eingecheckte Personen' : 'Registrierte Angehörige'} ({selectedFamilyMembers.length})
              </h4>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {selectedFamilyMembers.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                  >
                    <span className="font-medium text-[#121c2a] flex items-center gap-1.5">
                      {isSimCheckinAllowed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <span className="w-3.5 text-gray-400">•</span>
                      )}
                      {name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {i === 0 ? 'Hauptmitglied' : 'Begleitung'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close / OK */}
            <button
              type="button"
              onClick={() => setIsScannerSimOpen(false)}
              className="w-full py-2.5 bg-[#006191] hover:bg-[#007bb6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
