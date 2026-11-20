import React, { useState } from 'react';
import { X, CheckCircle2, Heart, Download, Scale, BookOpen } from 'lucide-react';
import { StatutenModal } from './StatutenModal';

export interface InfoModalProps {
  type: 'terms' | 'privacy' | 'faq' | 'volunteer' | 'report' | 'statutes' | null;
  onClose: () => void;
  onOpenStatutes?: () => void;
}

export const InfoModals: React.FC<InfoModalProps> = ({ type, onClose, onOpenStatutes }) => {
  const [volunteerSubmitted, setVolunteerSubmitted] = useState(false);

  if (!type) return null;

  if (type === 'statutes') {
    return <StatutenModal isOpen={true} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'terms' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-6 h-6 text-[#006191]" />
              <h2 className="text-2xl font-bold text-[#121c2a]">Nutzungsbedingungen &amp; Vereinsrecht</h2>
            </div>
            <p className="text-xs text-[#566771] mb-5">Stand: Vereinsjahr 2026 • Rechtssitz Schweiz (Art. 60–79 ZGB)</p>

            {/* Swiss Verein Statutory Callout */}
            <div className="p-4 bg-gradient-to-r from-[#eff3ff] to-white border border-[#006191]/30 rounded-xl mb-6 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  +
                </span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#006191] uppercase tracking-wider">
                    Schweizer Vereinsstatuten (Offizielles Rechtsdokument)
                  </h4>
                  <p className="text-xs text-[#3f4850] leading-relaxed">
                    Der <strong>Verein Percikan Iman Schweiz</strong> ist eine juristische Person nach schweizerischem Recht (Art. 60 ff. ZGB) mit Sitz im Kanton Zürich.
                    Die Rechte und Pflichten aller Mitglieder, Organe und Spender richten sich nach den offiziellen Statuten in deutscher Sprache.
                  </p>
                  {onOpenStatutes && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStatutes();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Vollständige Statuten (12 Artikel) aufrufen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#3f4850] leading-relaxed">
              <p>
                Willkommen bei Percikan Iman Schweiz. Mit dem Zugriff auf unsere Plattform, der Teilnahme an Vereinsprogrammen
                oder der Einzahlung von Mitgliedsbeiträgen und Spenden erkennen Sie die satzungsgemässen Grundsätze, Transparenzstandards
                und das Schweizer Vereinsrecht an.
              </p>
              <h3 className="font-bold text-[#121c2a]">1. Spenden &amp; Gemeinnützigkeit</h3>
              <p>
                Alle über dieses Portal eingegangenen Spenden werden satzungsgemäss für religiöse, bildende, soziale und wohltätige
                Zwecke verwendet. Spendenquittungen werden digital ausgestellt.
              </p>
              <h3 className="font-bold text-[#121c2a]">2. Mitgliedschaft &amp; Beiträge</h3>
              <p>
                Mitgliedsbeiträge sind Jahresbeiträge. Die Mitgliedschaftsrechte sowie die Beschlussfassung erfolgen gemäss Art. 6–10
                der Vereinsstatuten über die ordentliche Generalversammlung (GV).
              </p>
              <h3 className="font-bold text-[#121c2a]">3. Haftungsausschluss (Art. 75a ZGB)</h3>
              <p>
                Für die Verbindlichkeiten des Vereins haftet ausschliesslich das Vereinsvermögen. Eine persönliche Haftung der Mitglieder
                ist gesetzlich ausgeschlossen.
              </p>
            </div>
          </div>
        )}

        {type === 'privacy' && (
          <div>
            <h2 className="text-2xl font-bold text-[#121c2a] mb-2">Privacy Policy</h2>
            <p className="text-xs text-[#566771] mb-6">Last revised: January 2024</p>
            <div className="space-y-4 text-sm text-[#3f4850] leading-relaxed">
              <p>
                Percikan Iman values your privacy. We strictly safeguard personal data and never sell,
                rent, or trade donor or member details to third parties.
              </p>
              <h3 className="font-bold text-[#121c2a]">1. Information We Collect</h3>
              <p>
                We collect your name, email address, and contribution preferences solely to issue
                receipts, send event reminders, and share our quarterly impact reports.
              </p>
              <h3 className="font-bold text-[#121c2a]">2. Data Security</h3>
              <p>
                All financial transactions are encrypted via industry-standard TLS encryption protocols.
                We do not store full credit card numbers on our local servers.
              </p>
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div>
            <h2 className="text-2xl font-bold text-[#121c2a] mb-2">Frequently Asked Questions</h2>
            <p className="text-sm text-[#3f4850] mb-6">Everything you need to know about Percikan Iman.</p>
            <div className="space-y-4 text-sm text-[#3f4850]">
              <div className="bg-[#eff3ff] p-4 rounded-xl">
                <h4 className="font-bold text-[#006191] mb-1">How can I attend Majelis Ilmu Mingguan?</h4>
                <p className="text-xs md:text-sm leading-relaxed">
                  It is free and open to the public every Sunday morning at 08:30 WIB at our main center
                  or via our live stream on YouTube and website.
                </p>
              </div>
              <div className="bg-[#eff3ff] p-4 rounded-xl">
                <h4 className="font-bold text-[#006191] mb-1">Are donations tax-deductible?</h4>
                <p className="text-xs md:text-sm leading-relaxed">
                  At this time, donations are not tax-deductible. All contributions go directly toward community programs and social welfare initiatives, with official receipts issued for full transparency.
                </p>
              </div>
              <div className="bg-[#eff3ff] p-4 rounded-xl">
                <h4 className="font-bold text-[#006191] mb-1">Can I become a volunteer?</h4>
                <p className="text-xs md:text-sm leading-relaxed">
                  Absolutely! We regularly recruit volunteers for food distributions, health clinics, and youth mentoring.
                </p>
              </div>
            </div>
          </div>
        )}

        {type === 'volunteer' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-[#006191]" />
              <h2 className="text-2xl font-bold text-[#121c2a]">Volunteer With Us</h2>
            </div>
            <p className="text-sm text-[#3f4850] mb-6">
              Join over 600 active volunteers serving in food drives, clinics, and education.
            </p>

            {volunteerSubmitted ? (
              <div className="p-6 bg-emerald-50 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900">Application Submitted!</h4>
                <p className="text-xs text-emerald-700">
                  Our Volunteer Coordinator will reach out to you within 48 hours with orientation dates.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setVolunteerSubmitted(true);
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-medium text-[#3f4850] mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budi Santoso"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#006191] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3f4850] mb-1">Email &amp; Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="budi@example.com / 08123456789"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#006191] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3f4850] mb-1">Preferred Volunteer Field</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#006191] outline-none">
                    <option>Free Health Clinic (Medical / General)</option>
                    <option>Food for the Soul (Kitchen &amp; Distribution)</option>
                    <option>Youth Leadership Mentoring</option>
                    <option>Media, Photography &amp; Design</option>
                    <option>Event Logistics &amp; Security</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#006191] text-white rounded-lg font-bold text-sm hover:bg-[#007bb6] transition-colors"
                >
                  Submit Volunteer Application
                </button>
              </form>
            )}
          </div>
        )}

        {type === 'report' && (
          <div>
            <h2 className="text-2xl font-bold text-[#121c2a] mb-2">Annual Impact &amp; Financial Report</h2>
            <p className="text-sm text-[#3f4850] mb-6">
              Certified independent audit of foundation disbursements, programs, and social impact metrics.
            </p>
            <div className="bg-[#eff3ff] p-6 rounded-xl space-y-4 mb-6">
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="font-semibold text-[#121c2a]">Total Philanthropic Funds Raised:</span>
                <span className="font-bold text-[#006191]">$1,842,500</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="font-semibold text-[#121c2a]">Direct Program Allocations (92.4%):</span>
                <span className="font-bold text-emerald-700">$1,702,470</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-sm">
                <span className="font-semibold text-[#121c2a]">Operational &amp; Auditing (7.6%):</span>
                <span className="font-bold text-[#566771]">$140,030</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[#121c2a]">Auditor Opinion:</span>
                <span className="font-bold text-[#006191]">Unqualified (Clean)</span>
              </div>
            </div>
            <button
              onClick={() => alert('Downloading Official Impact Report PDF (Certified Audit 2024)...')}
              className="w-full py-3 bg-[#006191] text-white rounded-lg font-bold text-sm hover:bg-[#007bb6] transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Full Audit Report (PDF)
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-[#3f4850] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
