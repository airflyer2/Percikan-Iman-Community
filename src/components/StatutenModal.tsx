import React, { useState, useMemo } from 'react';
import {
  OFFICIAL_SWISS_STATUTEN,
  SWISS_VEREIN_LEGAL_INFO,
  StatuteArticle
} from '../constants';
import {
  X,
  FileText,
  Search,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Scale,
  Calendar,
  Vote,
  BookOpen,
  Award,
  Mail
} from 'lucide-react';

interface StatutenModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialArticleNumber?: number;
}

export const StatutenModal: React.FC<StatutenModalProps> = ({
  isOpen,
  onClose,
  initialArticleNumber
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<number | null>(initialArticleNumber || null);
  const [copiedArticle, setCopiedArticle] = useState<number | null>(null);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return OFFICIAL_SWISS_STATUTEN;
    const q = searchQuery.toLowerCase();
    return OFFICIAL_SWISS_STATUTEN.filter((art) => {
      const matchTitle = art.title.toLowerCase().includes(q);
      const matchNum = `art ${art.number}`.includes(q) || `artikel ${art.number}`.includes(q);
      const matchContent = art.content.some((c) => c.toLowerCase().includes(q));
      const matchSub = art.subsections?.some(
        (s) => s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
      );
      const matchZgb = (art.zgbReference || '').toLowerCase().includes(q);
      return matchTitle || matchNum || matchContent || matchSub || matchZgb;
    });
  }, [searchQuery]);

  const handleCopyCitation = (art: StatuteArticle) => {
    const text = `Art. ${art.number} (${art.title}) Statuten des Vereins Percikan Iman (Art. 60–79 ZGB):\n${art.content.join(
      '\n'
    )}${
      art.subsections
        ? '\n' + art.subsections.map((s) => `${s.label} ${s.text}`).join('\n')
        : ''
    }`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedArticle(art.number);
      setTimeout(() => setCopiedArticle(null), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const documentBody = [
      `========================================================================`,
      `VEREIN PERCIKAN IMAN`,
      `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ`,
      `Statuten - Percikan Iman`,
      `Statuten Percikan Iman vom 07. Januar 2025 / ${SWISS_VEREIN_LEGAL_INFO.documentRef}`,
      `E-Mail: ${SWISS_VEREIN_LEGAL_INFO.email}`,
      `========================================================================\n`,
      OFFICIAL_SWISS_STATUTEN.map((a) => {
        const header = `${a.number}. ${a.title} ${a.zgbReference ? `(${a.zgbReference})` : ''}`;
        const paragraphs = a.content.join('\n');
        const sub = a.subsections
          ? '\n' + a.subsections.map((s) => `   ${s.label} ${s.text}`).join('\n')
          : '';
        return `${header}\n${paragraphs}${sub}`;
      }).join('\n\n'),
      `\n========================================================================`,
      `Die Statuten wurden an der konstituierenden Vereinsversammlung vom 23. Februar 2025 genehmigt.`,
      `Sie gelten ab sofort.\n`,
      `Der Präsident:               Die Protokollführer:`,
      `${SWISS_VEREIN_LEGAL_INFO.president}                   ${SWISS_VEREIN_LEGAL_INFO.minuteKeepers.join(', ')}`,
      `========================================================================`
    ].join('\n');

    const blob = new Blob([documentBody], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Statuten_Percikan_Iman_20250107_FINAL.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      id="statuten-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white"
    >
      <div
        id="statuten-modal-container"
        className="bg-[#fcfcff] text-[#121c2a] rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#bec7d2]/70 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Top Header (Swiss Official Legal Banner) */}
        <div className="bg-[#003859] text-white p-5 sm:p-6 border-b border-[#002b45] relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close Statutes"
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors print:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-8">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Swiss Flag / Legal Basis Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold tracking-wider uppercase shadow-xs">
                  <span className="font-mono text-sm leading-none">+</span> Schweiz / Switzerland
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium">
                  <Scale className="w-3 h-3 text-sky-200" />
                  Art. 60–79 ZGB
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-medium font-mono">
                  Sitz: Zürich
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-medium">
                  Genehmigt: 23. Feb 2025
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-sky-300 shrink-0" />
                Statuten – Percikan Iman
              </h1>

              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-3xl">
                Amtliche Vereinsstatuten im Sinne von Art. 60–79 ZGB • Sitz in Zürich • Genehmigt an der konstituierenden Vereinsversammlung vom 23. Februar 2025
              </p>
            </div>

            {/* Quick Print & Download Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
                title="Statuten drucken"
              >
                <Printer className="w-4 h-4" />
                <span>Drucken</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Offizielle Statuten als Textdatei (.txt) herunterladen"
              >
                <Download className="w-4 h-4" />
                <span>Statuten-Text (.txt)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Swiss Legal Identity Ribbon */}
        <div className="bg-[#eff3ff] border-b border-[#bec7d2]/40 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#3f4850] shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#006191]" />
              <strong>Sitz:</strong> {SWISS_VEREIN_LEGAL_INFO.seatCity} (ZH)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <strong>Zweck:</strong> Weder Erwerbs- noch Selbsthilfezwecke
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-purple-700" />
              <strong>Organe:</strong> Vereinsversammlung, Vorstand, Revisionsstelle
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#006191]" />
              <strong>Vereinsjahr:</strong> Kalenderjahr
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-700" />
              <strong>Kontakt:</strong> {SWISS_VEREIN_LEGAL_INFO.email}
            </span>
          </div>

          <span className="text-[11px] font-medium text-[#006191] bg-white px-2.5 py-0.5 rounded-full border border-[#bec7d2]/60">
            Dokument: {SWISS_VEREIN_LEGAL_INFO.documentRef}
          </span>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-[#bec7d2]/30 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6f7881] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Statuten nach Stichwort durchsuchen (z. B. Vorstand, Beitrag, Ramadan, Revisionsstelle)..."
              className="w-full pl-9 pr-8 py-2 bg-[#f4f6fa] border border-[#bec7d2]/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#006191] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick TOC Pill Selector (12 Articles) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <span className="text-gray-400 font-semibold text-[11px] uppercase mr-1">Artikel:</span>
            {OFFICIAL_SWISS_STATUTEN.map((art) => (
              <button
                key={art.number}
                type="button"
                onClick={() => {
                  setActiveArticle(art.number);
                  const el = document.getElementById(`statute-article-${art.number}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                  activeArticle === art.number
                    ? 'bg-[#006191] text-white'
                    : 'bg-[#eff3ff] text-[#006191] hover:bg-[#d3e5f1]'
                }`}
              >
                Art. {art.number}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Statutes Articles Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 bg-[#fcfcff]">
          {/* Authentic Document Title & Bismillah Header */}
          <div className="text-center pb-4 pt-2 border-b border-[#bec7d2]/40 space-y-3">
            <p className="font-serif text-xl sm:text-2xl text-[#003859] tracking-wider" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#121c2a] tracking-tight">
                Statuten – Percikan Iman
              </h2>
              <p className="text-xs text-[#566771]">
                Statuten Percikan Iman vom 07. Januar 2025 / {SWISS_VEREIN_LEGAL_INFO.documentRef}
              </p>
              <p className="text-xs text-[#006191] font-mono">
                e-mail: {SWISS_VEREIN_LEGAL_INFO.email}
              </p>
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#bec7d2] p-6">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="font-bold text-[#121c2a]">Kein Artikel gefunden</p>
              <p className="text-xs text-[#566771] mt-1">
                Für den Suchbegriff &ldquo;{searchQuery}&rdquo; wurden keine Übereinstimmungen in den Statuten gefunden.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 bg-[#006191] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Suche zurücksetzen
              </button>
            </div>
          ) : (
            filteredArticles.map((article) => {
              const isSelected = activeArticle === article.number;
              const wasCopied = copiedArticle === article.number;

              return (
                <section
                  key={article.number}
                  id={`statute-article-${article.number}`}
                  className={`p-6 bg-white rounded-xl border transition-all scroll-mt-6 ${
                    isSelected
                      ? 'border-[#006191] ring-2 ring-[#006191]/20 shadow-sm'
                      : 'border-[#bec7d2]/60 hover:border-[#bec7d2]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#bec7d2]/30 pb-3 mb-4 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-[#006191] text-white text-xs font-bold rounded-lg font-mono">
                        {article.number}.
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-[#121c2a]">
                        {article.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {article.zgbReference && (
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-[#eff3ff] text-[#006191] rounded-md font-semibold border border-[#d3e5f1]">
                          {article.zgbReference}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(article)}
                        className="text-xs text-[#566771] hover:text-[#006191] px-2 py-1 rounded hover:bg-gray-100 transition-colors print:hidden inline-flex items-center gap-1 cursor-pointer"
                        title="Diesen Artikel zitieren"
                      >
                        {wasCopied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-medium">Kopiert</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>Zitieren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Paragraphs */}
                  <div className="space-y-3 text-xs sm:text-sm text-[#2c3540] leading-relaxed">
                    {article.content.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}

                    {/* Subsections with exact Roman or lettered clauses */}
                    {article.subsections && article.subsections.length > 0 && (
                      <div className="mt-3 pl-3 sm:pl-5 border-l-2 border-[#006191]/30 space-y-2.5 pt-1">
                        {article.subsections.map((sub, sIdx) => (
                          <div key={sIdx} className="space-y-0.5">
                            <span className="font-bold text-[#121c2a] block text-xs sm:text-sm">
                              {sub.label}
                            </span>
                            <span className="text-[#3f4850] block whitespace-pre-line leading-relaxed">
                              {sub.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}

          {/* Official Adoption Clause & Signatories (Page 9 of PDF) */}
          <div className="p-6 bg-white rounded-xl border border-[#bec7d2]/70 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#bec7d2]/40 pb-3">
              <Award className="w-5 h-5 text-[#006191]" />
              <h4 className="text-sm font-bold text-[#121c2a] uppercase tracking-wider">
                Genehmigung und Inkrafttreten
              </h4>
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-[#3f4850] leading-relaxed">
              <p className="font-semibold text-[#121c2a]">
                Die Statuten wurden an der konstituierenden Vereinsversammlung vom 23. Februar 2025 genehmigt.
              </p>
              <p className="text-emerald-700 font-bold">
                Sie gelten ab sofort.
              </p>
            </div>

            {/* Official Signatures Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#bec7d2]/40 text-xs sm:text-sm">
              <div className="p-4 bg-[#f8fafc] rounded-xl border border-gray-200 flex flex-col justify-between h-32">
                <div>
                  <span className="text-[11px] font-bold text-[#6f7881] uppercase tracking-wider block mb-1">
                    Der Präsident:
                  </span>
                  <p className="font-bold text-[#121c2a] text-base">{SWISS_VEREIN_LEGAL_INFO.president}</p>
                </div>
                <div className="border-t border-gray-300 pt-1 text-[11px] text-[#6f7881]">
                  Kollektivunterschrift zu zweien gemäss Art. 9 Abs. XII lit. f
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] rounded-xl border border-gray-200 flex flex-col justify-between h-32">
                <div>
                  <span className="text-[11px] font-bold text-[#6f7881] uppercase tracking-wider block mb-1">
                    Die Protokollführer:
                  </span>
                  <p className="font-bold text-[#121c2a]">
                    {SWISS_VEREIN_LEGAL_INFO.minuteKeepers.join(', ')}
                  </p>
                </div>
                <div className="border-t border-gray-300 pt-1 text-[11px] text-[#6f7881]">
                  Protokollführung der konstituierenden Versammlung
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
              <span>{SWISS_VEREIN_LEGAL_INFO.documentRef}</span>
              <span className="font-mono">{SWISS_VEREIN_LEGAL_INFO.email}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#eff3ff] border-t border-[#bec7d2]/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <p className="text-xs text-[#566771] flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#006191]" />
            Offizielles Rechtsdokument • Schweizerisches Zivilgesetzbuch (Art. 60–79 ZGB)
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-[#006191] hover:bg-[#007bb6] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
