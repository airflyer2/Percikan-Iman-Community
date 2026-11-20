import React, { useEffect, useRef, useState } from 'react';
import { DONATION_HERO_IMAGE } from '../constants';
import { Campaign, ContributionDestination } from '../types';
import {
  formatFirestoreError,
  isValidEmailFormat,
  subscribeCampaigns,
  subscribeDestinations
} from '../lib/firestoreContent';
import { submitDonationPledge } from '../lib/firestoreDonations';
import { Check, X, Heart, ChevronDown, Landmark, ShieldCheck, Copy, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

export const DonateView: React.FC = () => {
  const { t } = useLanguage();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [destinations, setDestinations] = useState<ContributionDestination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [ibanCopied, setIbanCopied] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    donorName: string;
    amount: number;
    project: string;
    date: string;
  } | null>(null);

  const [projectsModalOpen, setProjectsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubCampaigns = subscribeCampaigns((res) => {
      setCampaigns(res.data);
      setCampaignsLoading(res.loading);
      setCampaignsError(res.error);
    });
    const unsubDestinations = subscribeDestinations((res) => {
      setDestinations(res.data);
      setDestinationsLoading(res.loading);
      setDestinationsError(res.error);
    });
    return () => {
      unsubCampaigns();
      unsubDestinations();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedProject && destinations.length > 0) {
      setSelectedProject(destinations[0].name);
    }
  }, [destinations, selectedProject]);

  const currentDonationAmount = customAmount ? parseFloat(customAmount) || 0 : selectedPreset;
  const isAmountValid =
    Number.isFinite(currentDonationAmount) &&
    currentDonationAmount >= 1 &&
    currentDonationAmount <= 100_000;

  const otherCampaigns = campaigns.slice(3);

  const selectedDestinationInfo = destinations.find(
    (d) => d.name === selectedProject || d.shortLabel === selectedProject
  ) || {
    id: 'custom',
    name: selectedProject || t.donate.destinationLabel,
    shortLabel: selectedProject || t.donate.destinationLabel,
    category: 'Zweckgebundenes Projekt',
    description: selectedProject
      ? `Direkte Zuweisung zur Unterstützung von: ${selectedProject}.`
      : 'Wählen Sie ein Spendenziel oder eine aktive Kampagne aus.'
  };

  const handleSelectPreset = (val: number) => {
    setSelectedPreset(val);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedPreset(0);
  };

  const handleCampaignDonate = (campaign: Campaign) => {
    setSelectedProject(campaign.title);
    const element = document.getElementById('donation-form-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCopyIban = async () => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText('CH89 0900 0000 6049 6610 7');
      setIbanCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setIbanCopied(false);
        copyTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard permission denied or unavailable; silently ignore without unhandled rejection
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setSubmitError(null);

    if (!isAmountValid) {
      setSubmitError('Donation amount must be between CHF 1 and CHF 100,000.');
      return;
    }
    if (!fullName.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setSubmitError('Please enter a valid email address.');
      return;
    }
    const targetDestination = selectedProject.trim();
    if (!targetDestination) {
      setSubmitError('Please select a donation destination or campaign.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const pledge = await submitDonationPledge({
        donorName: fullName.trim(),
        email: email.trim(),
        amount: currentDonationAmount,
        destination: targetDestination,
        paymentMethod: 'PostFinance / Bank Transfer (CHF)',
        notes: 'Public web donation pledge (CHF)'
      });

      setReceiptData({
        id: pledge.id,
        donorName: pledge.donorName,
        amount: pledge.amount,
        project: pledge.destination,
        date: new Date().toLocaleDateString('de-CH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
    } catch (err) {
      setSubmitError(formatFirestoreError(err, 'Failed to submit donation pledge.'));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setReceiptData(null);
    setFullName('');
    setEmail('');
    setCustomAmount('');
    setSelectedPreset(50);
    setSubmitError(null);
  };

  return (
    <div className="w-full">
      {/* Hero Impact Section */}
      <section className="relative py-14 lg:py-20 bg-white border-b border-[#DCE2DF]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#E7F3EE] text-[#0D6E52] text-xs font-semibold mb-4 border border-[#0D6E52]/20">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.donate.transparencyGuarantee}</span>
            </div>
            <h1 className="display-hero font-semibold text-[#0F1D26] mb-4">
              {t.donate.title}
            </h1>
            <p className="text-base md:text-lg text-[#4A5862] mb-8 max-w-[60ch] leading-relaxed">
              {t.donate.subtitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div className="flex items-center gap-3 p-3.5 bg-[#F6F7F4] border border-[#DCE2DF] rounded-lg">
                <Landmark className="w-5 h-5 text-[#005A87] shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-xs font-bold text-[#0F1D26] block">PostFinance Vereinskonto</span>
                  <span className="font-mono text-[11px] text-[#4A5862]">CH89 0900 0000 6049 6610 7</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-[#F6F7F4] border border-[#DCE2DF] rounded-lg">
                <ShieldCheck className="w-5 h-5 text-[#0D6E52] shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-xs font-bold text-[#0F1D26] block">100% Zweckgebunden</span>
                  <span className="text-[11px] text-[#4A5862]">Geprüft gemäss Art. 10 Statuten</span>
                </div>
              </div>
            </div>
          </div>

          <figure className="lg:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-[#DCE2DF] bg-[#EEF2F0]">
            <img
              src={DONATION_HERO_IMAGE}
              alt="Gemeinschaftliche Unterstützung und Bildungsarbeit"
              className="w-full h-full object-cover"
            />
          </figure>
        </div>
      </section>

      {/* Active Campaigns Grid */}
      <section className="py-16 max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="display-section font-semibold text-[#0F1D26] mb-1.5">
              {t.donate.featuredCampaignsTitle}
            </h2>
            <p className="text-[#4A5862] text-base max-w-[60ch]">
              {t.donate.featuredCampaignsSubtitle}
            </p>
          </div>
          {otherCampaigns.length > 0 && (
            <button
              type="button"
              onClick={() => setProjectsModalOpen(true)}
              className="min-h-10 px-4 py-2 bg-white hover:bg-[#EEF2F0] border border-[#DCE2DF] text-[#0F1D26] rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
            >
              Weitere {otherCampaigns.length} Hilfsprojekte ansehen
            </button>
          )}
        </div>

        {campaignsError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{campaignsError}</span>
          </div>
        )}

        {campaignsLoading ? (
          <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-white rounded-xl p-8 border border-[#DCE2DF] h-72" />
            <div className="md:col-span-5 bg-white rounded-xl p-8 border border-[#DCE2DF] h-72" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl p-10 border border-dashed border-[#DCE2DF] text-center text-sm text-[#4A5862]">
            Derzeit sind keine aktiven Spendenkampagnen veröffentlicht.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Primary Campaign Card (Span 7) */}
            {campaigns[0] && (
              <article className="md:col-span-7 bg-white rounded-xl p-7 sm:p-8 border border-[#DCE2DF] program-card-shadow flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="bg-[#E6F0F5] text-[#005A87] border border-[#005A87]/20 px-2.5 py-1 rounded text-xs font-semibold">
                      {campaigns[0].tag || t.donate.criticalNeed}
                    </span>
                    {campaigns[0].beneficiaries && (
                      <span className="text-xs text-[#4A5862] font-medium">
                        Begünstigte: {campaigns[0].beneficiaries}
                      </span>
                    )}
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0F1D26] mb-3">
                    {campaigns[0].title}
                  </h3>
                  <p className="text-[#4A5862] text-base mb-8 max-w-[58ch] leading-relaxed">
                    {campaigns[0].description}
                  </p>
                </div>

                <div className="pt-5 border-t border-[#EEF2F0]">
                  <div className="flex justify-between items-baseline text-sm font-semibold mb-2 text-[#0F1D26] tabular-nums">
                    <span>
                      Stand: CHF {campaigns[0].currentAmount.toLocaleString('de-CH')}{' '}
                      <span className="text-[#4A5862] font-normal">
                        ({Math.round((campaigns[0].currentAmount / Math.max(1, campaigns[0].goalAmount)) * 100)}%)
                      </span>
                    </span>
                    <span className="text-xs text-[#4A5862]">
                      Ziel: CHF {campaigns[0].goalAmount.toLocaleString('de-CH')}
                    </span>
                  </div>
                  <div className="w-full bg-[#EEF2F0] h-2.5 rounded-full overflow-hidden mb-6">
                    <div
                      className="bg-[#005A87] h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((campaigns[0].currentAmount / Math.max(1, campaigns[0].goalAmount)) * 100)
                        )}%`
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCampaignDonate(campaigns[0])}
                    className="w-full sm:w-auto min-h-11 px-6 py-3 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Für dieses Projekt spenden
                  </button>
                </div>
              </article>
            )}

            {/* Secondary Campaign Stack (Span 5) */}
            <div className="md:col-span-5 flex flex-col gap-6">
              {campaigns.slice(1, 3).map((camp) => {
                const pct = Math.min(100, Math.round((camp.currentAmount / Math.max(1, camp.goalAmount)) * 100));
                return (
                  <article
                    key={camp.id}
                    className="bg-white rounded-xl p-6 border border-[#DCE2DF] program-card-shadow flex flex-col justify-between flex-1"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#E7F3EE] text-[#0D6E52]">
                          {camp.tag || 'KAMPAGNE'}
                        </span>
                        <span className="font-mono text-xs text-[#4A5862] tabular-nums">
                          CHF {camp.currentAmount.toLocaleString('de-CH')} / {camp.goalAmount.toLocaleString('de-CH')}
                        </span>
                      </div>
                      <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                        {camp.title}
                      </h3>
                      <p className="text-[#4A5862] text-sm mb-4 leading-relaxed">
                        {camp.description}
                      </p>
                    </div>

                    <div>
                      <div className="w-full bg-[#EEF2F0] h-2 rounded-full overflow-hidden mb-4">
                        <div
                          className="bg-[#0D6E52] h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCampaignDonate(camp)}
                        className="w-full min-h-10 py-2 bg-[#F6F7F4] hover:bg-[#005A87] text-[#0F1D26] hover:text-white border border-[#DCE2DF] hover:border-[#005A87] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Zweck auswählen ({pct}% erreicht)
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Secure Donation Portal */}
      <section id="donation-form-section" className="py-16 bg-white border-t border-[#DCE2DF]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Donation Form Column */}
          <div className="lg:col-span-7 bg-[#F6F7F4] p-6 sm:p-8 rounded-xl border border-[#DCE2DF]">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
              <h2 className="display-section font-semibold text-[#0F1D26]">
                {t.donate.proceedDonation}
              </h2>
              {selectedProject && (
                <span className="text-xs bg-white text-[#005A87] border border-[#DCE2DF] font-semibold px-3 py-1 rounded-md">
                  Zweck: {selectedProject}
                </span>
              )}
            </div>
            <p className="text-sm text-[#4A5862] mb-6 leading-relaxed">
              {t.donate.transparencyGuaranteeDesc} • <span className="font-medium text-[#0F1D26]">{t.donate.taxDeductibleNotice}</span>
            </p>

            {destinationsError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{destinationsError}</span>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={(e) => void handleDonationSubmit(e)} className="space-y-6">
              {/* Contribution Destination Dropdown */}
              <div>
                <label
                  htmlFor="form-destination-dropdown"
                  className="block text-sm font-semibold text-[#0F1D26] mb-2"
                >
                  {t.donate.destinationLabel}
                </label>
                <div className="relative" aria-busy={destinationsLoading ? 'true' : undefined}>
                  <select
                    id="form-destination-dropdown"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-[#DCE2DF] hover:border-[#005A87] focus:border-[#005A87] rounded-lg text-sm font-semibold text-[#0F1D26] outline-none cursor-pointer transition-colors"
                  >
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.name}>
                        {dest.name}
                      </option>
                    ))}
                    {selectedProject &&
                      !destinations.some((d) => d.name === selectedProject) && (
                        <option value={selectedProject}>{selectedProject}</option>
                      )}
                  </select>
                  <ChevronDown
                    className="w-4 h-4 text-[#005A87] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                {!destinationsLoading && destinations.length === 0 && (
                  <p className="text-xs text-[#4A5862] mt-1.5">
                    Keine Spendenzwecke verfügbar. Bitte wählen Sie eine aktive Kampagne oder versuchen Sie es später erneut.
                  </p>
                )}
              </div>

              {/* Preset Amounts (CHF) */}
              <div>
                <span className="block text-sm font-semibold text-[#0F1D26] mb-2">
                  {t.donate.selectAmount} (CHF)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Preset donation amounts in CHF">
                  {[25, 50, 100, 250].map((amt) => {
                    const isSelected = selectedPreset === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectPreset(amt)}
                        className={`min-h-12 py-3 border rounded-lg font-bold text-sm tabular-nums transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#0F1D26] bg-[#0F1D26] text-white'
                            : 'border-[#DCE2DF] hover:border-[#005A87] text-[#0F1D26] bg-white'
                        }`}
                      >
                        CHF {amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label htmlFor="custom-chf-amount" className="block text-sm font-semibold text-[#0F1D26] mb-2">
                  {t.donate.customAmount} (CHF)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[#4A5862]">
                    CHF
                  </span>
                  <input
                    id="custom-chf-amount"
                    type="number"
                    min="1"
                    max="100000"
                    step="any"
                    value={customAmount}
                    onChange={handleCustomChange}
                    placeholder="0.00"
                    className="w-full pl-13 pr-4 py-3 rounded-lg border border-[#DCE2DF] focus:border-[#005A87] bg-white outline-none transition-colors text-base tabular-nums"
                  />
                </div>
              </div>

              {/* Donor info fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="donor-full-name" className="block text-sm font-semibold text-[#0F1D26] mb-2">
                    {t.programs.fullName}
                  </label>
                  <input
                    id="donor-full-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Vor- und Nachname"
                    className="w-full px-4 py-3 rounded-lg border border-[#DCE2DF] focus:border-[#005A87] bg-white outline-none transition-colors text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="donor-email" className="block text-sm font-semibold text-[#0F1D26] mb-2">
                    {t.programs.emailAddress}
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.ch"
                    className="w-full px-4 py-3 rounded-lg border border-[#DCE2DF] focus:border-[#005A87] bg-white outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isAmountValid || !selectedProject}
                className="w-full min-h-13 py-3.5 bg-[#005A87] hover:bg-[#004569] text-white rounded-lg font-semibold text-base transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 tabular-nums"
              >
                {isSubmitting ? (
                  <span>{t.programs.submitting}...</span>
                ) : (
                  <>
                    <Heart className="w-4 h-4" aria-hidden="true" />
                    <span>{t.donate.proceedDonation} • CHF {currentDonationAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contribution Destination & Official Swiss Bank Details Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Direct Bank Transfer / PostFinance Details */}
            <div className="bg-[#0F1D26] text-white p-7 rounded-xl border border-[#0F1D26] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <span className="text-xs font-semibold text-[#8fcdff] flex items-center gap-2">
                  <Landmark className="w-4 h-4" aria-hidden="true" />
                  <span>Banküberweisung Schweiz (CHF)</span>
                </span>
                <span className="text-[11px] font-semibold bg-[#0D6E52] text-white px-2.5 py-0.5 rounded">
                  PostFinance
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-white/65 block text-xs">IBAN (PostFinance Zürich):</span>
                  <div className="mt-1 flex items-center justify-between gap-2 bg-white/10 px-3.5 py-2.5 rounded-lg border border-white/15">
                    <strong className="font-mono text-sm text-white tracking-wider select-all">
                      CH89 0900 0000 6049 6610 7
                    </strong>
                    <button
                      type="button"
                      onClick={handleCopyIban}
                      className="min-h-8 px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {ibanCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#8fcdff]" aria-hidden="true" />
                          <span>Kopiert</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Kopieren</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-white/65 block text-xs">Kontoinhaber:</span>
                    <span className="font-semibold text-white text-xs">Verein Percikan Iman, 8000 Zürich</span>
                  </div>
                  <div>
                    <span className="text-white/65 block text-xs">Verwendungszweck:</span>
                    <span className="font-mono text-xs text-[#8fcdff]">{selectedProject || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Destination Info */}
            <div
              id="contribution-destination-box"
              className="bg-[#F6F7F4] p-7 rounded-xl border border-[#DCE2DF]"
            >
              <h3 className="font-editorial text-xl font-semibold text-[#0F1D26] mb-2">
                Zweckbindung &amp; Mittelverwendung
              </h3>
              <p className="text-sm text-[#4A5862] mb-4 leading-relaxed">
                Wählen Sie aus, welchem Vereinsfonds oder Hilfsprojekt Ihr Beitrag gutgeschrieben wird.
              </p>

              <div className="p-4 bg-white rounded-lg border border-[#DCE2DF] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#005A87]">
                    {selectedDestinationInfo.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D6E52] bg-[#E7F3EE] px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" aria-hidden="true" /> Direkt zugewiesen
                  </span>
                </div>
                <p className="text-xs text-[#4A5862] leading-relaxed">
                  {selectedDestinationInfo.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Ongoing Projects Modal */}
      {projectsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="other-projects-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1D26]/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-[#DCE2DF] relative">
            <button
              type="button"
              onClick={() => setProjectsModalOpen(false)}
              aria-label="Close ongoing projects dialog"
              className="min-h-10 min-w-10 absolute top-4 right-4 p-2 text-[#4A5862] hover:text-[#0F1D26] rounded-full inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <h3 id="other-projects-modal-title" className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-1">
              Weitere Gemeinschafts- &amp; Hilfsprojekte
            </h3>
            <p className="text-sm text-[#4A5862] mb-6">
              Zweckgebundene Initiativen in Bildung, Ramadan-Hilfe, Familienförderung und Solidarität.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherCampaigns.map((proj) => {
                const pct = Math.min(100, Math.round((proj.currentAmount / Math.max(1, proj.goalAmount)) * 100));
                return (
                  <div
                    key={proj.id}
                    className="p-5 rounded-xl border border-[#DCE2DF] bg-[#F6F7F4] flex flex-col justify-between"
                  >
                    <div>
                      {proj.tag && (
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 bg-white text-[#005A87] border border-[#DCE2DF] rounded mb-2">
                          {proj.tag}
                        </span>
                      )}
                      <h4 className="font-editorial font-semibold text-[#0F1D26] text-lg mb-1">{proj.title}</h4>
                      <p className="text-xs text-[#4A5862] leading-relaxed mb-4">
                        {proj.description}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-[#4A5862] mb-1.5 tabular-nums">
                        <span>{pct}% finanziert</span>
                        <span>Ziel: CHF {proj.goalAmount.toLocaleString('de-CH')}</span>
                      </div>
                      <div className="w-full bg-[#DCE2DF] h-2 rounded-full overflow-hidden mb-3">
                        <div
                          className="bg-[#005A87] h-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(proj.title);
                          setProjectsModalOpen(false);
                          const element = document.getElementById('donation-form-section');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full min-h-9 py-2 bg-white border border-[#DCE2DF] hover:border-[#005A87] text-[#0F1D26] hover:bg-[#005A87] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Projekt auswählen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Donation Pledge Confirmation Modal */}
      {receiptData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1D26]/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-[#DCE2DF] relative text-center">
            <div className="w-14 h-14 bg-[#E7F3EE] text-[#0D6E52] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 stroke-[2.5]" aria-hidden="true" />
            </div>
            <span className="inline-block px-3 py-1 bg-[#E7F3EE] text-[#0D6E52] text-xs font-semibold rounded mb-2">
              {t.donate.pledgeSubmittedBadge}
            </span>
            <h3 id="receipt-modal-title" className="font-editorial text-2xl font-semibold text-[#0F1D26] mb-1">
              {t.donate.pledgeSubmittedTitle}
            </h3>
            <p className="text-sm text-[#4A5862] mb-5">
              {t.donate.pledgeSubmittedDesc}
            </p>

            <div className="bg-[#F6F7F4] border border-[#DCE2DF] rounded-xl p-4 text-left space-y-2.5 mb-4 text-sm text-[#0F1D26] tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#4A5862]">Referenz-Nr.:</span>
                <span className="font-mono font-semibold text-[#005A87]">{receiptData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5862]">Name:</span>
                <span className="font-medium">{receiptData.donorName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#4A5862] shrink-0">Zweck:</span>
                <span className="font-semibold text-[#0F1D26] text-right">{receiptData.project}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5862]">Betrag:</span>
                <span className="font-bold text-base text-[#0D6E52]">
                  CHF {receiptData.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5862]">Datum:</span>
                <span>{receiptData.date}</span>
              </div>
            </div>

            <div className="bg-[#0F1D26] text-white rounded-xl p-3.5 text-left text-xs space-y-1 mb-6">
              <span className="text-[#8fcdff] font-semibold block">PostFinance IBAN (CHF)</span>
              <span className="font-mono tracking-wider block">CH89 0900 0000 6049 6610 7</span>
              <span className="text-white/75 block">
                {t.donate.reference}: {receiptData.id}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseReceiptModal}
              className="w-full min-h-11 py-3 bg-[#005A87] text-white rounded-lg font-semibold text-sm hover:bg-[#004569] transition-colors cursor-pointer"
            >
              {t.programs.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
