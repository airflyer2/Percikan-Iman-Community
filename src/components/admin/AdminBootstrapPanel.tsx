import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { getFirebaseServices } from '../../lib/firebase';
import {
  BOOTSTRAP_VERSION,
  checkBootstrapStatus,
  runInitialBootstrap
} from '../../lib/firestoreBootstrap';
import { formatFirestoreError } from '../../lib/firestoreContent';
import { BootstrapMetadata } from '../../types';

const INSPECTED_COLLECTIONS = [
  'programs',
  'campaigns',
  'destinations',
  'donationReports',
  'boardMembers',
  'events',
  'members',
  'assemblyQuestions',
  'boardInquiries'
] as const;

export interface AdminBootstrapPanelProps {
  onBootstrapComplete?: (metadata: BootstrapMetadata) => void;
}

export const AdminBootstrapPanel: React.FC<AdminBootstrapPanelProps> = ({
  onBootstrapComplete
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  const [statusLoading, setStatusLoading] = useState(true);
  const [statusCheckFailed, setStatusCheckFailed] = useState(false);
  const [bootstrapMeta, setBootstrapMeta] = useState<BootstrapMetadata | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const [isSeeding, setIsSeeding] = useState(false);
  const isSeedingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [countWarning, setCountWarning] = useState<string | null>(null);

  const loadLiveCollectionCounts = useCallback(async (): Promise<Record<string, number>> => {
    const services = getFirebaseServices();
    if (!services) {
      return {};
    }

    const entries = await Promise.all(
      INSPECTED_COLLECTIONS.map(async (colName) => {
        const colRef = collection(services.db, colName);
        try {
          const countSnap = await getCountFromServer(colRef);
          return [colName, countSnap.data().count] as const;
        } catch {
          const docsSnap = await getDocs(colRef);
          return [colName, docsSnap.size] as const;
        }
      })
    );

    return Object.fromEntries(entries);
  }, []);

  const refreshState = useCallback(async () => {
    if (!isSuperAdmin) {
      setStatusLoading(false);
      return;
    }

    setStatusLoading(true);
    setStatusCheckFailed(false);
    setError(null);
    setCountWarning(null);
    try {
      const [meta, counts] = await Promise.all([
        checkBootstrapStatus(),
        loadLiveCollectionCounts()
      ]);
      setBootstrapMeta(meta);
      setCollectionCounts(counts);
    } catch (err) {
      setStatusCheckFailed(true);
      setError(formatFirestoreError(err, 'Failed to inspect Firestore bootstrap status.'));
    } finally {
      setStatusLoading(false);
    }
  }, [isSuperAdmin, loadLiveCollectionCounts]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  if (!isSuperAdmin) {
    return (
      <div
        data-testid="bootstrap-access-denied"
        className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#121c2a]">{t.nav.accessDenied}</h2>
        <p className="text-xs text-[#566771]">{t.nav.accessDeniedDesc}</p>
      </div>
    );
  }

  const handleRunBootstrap = async () => {
    if (!currentUser || bootstrapMeta || statusCheckFailed || isSeeding || isSeedingRef.current) return;

    isSeedingRef.current = true;
    setIsSeeding(true);
    setError(null);
    setCountWarning(null);
    try {
      const meta = await runInitialBootstrap(currentUser);
      setBootstrapMeta(meta);
      onBootstrapComplete?.(meta);
      try {
        const updatedCounts = await loadLiveCollectionCounts();
        setCollectionCounts(updatedCounts);
      } catch (countErr) {
        setCountWarning(
          formatFirestoreError(
            countErr,
            'Bootstrap completed and locked, but live collection counts could not be refreshed.'
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Initial Firestore bootstrap failed. Please inspect logs and try again.'
      );
    } finally {
      isSeedingRef.current = false;
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6eeff] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff3ff] text-[#006191] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121c2a]">{t.admin.bootstrapTitle}</h2>
              <p className="text-xs text-[#566771] mt-1">{t.admin.bootstrapDesc}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refreshState()}
            disabled={statusLoading || isSeeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#bec7d2] rounded-lg text-xs font-semibold text-[#121c2a] hover:bg-gray-50 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Counts</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {countWarning && !error && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{countWarning}</span>
          </div>
        )}

        {statusLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-xs text-[#566771]">
            <div className="w-7 h-7 border-3 border-[#006191] border-t-transparent rounded-full animate-spin mb-3" />
            <span>Inspecting `/siteConfig/bootstrap` and live Firestore collections...</span>
          </div>
        ) : statusCheckFailed ? (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-950">
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Bootstrap Status Verification Required</span>
              </p>
              <p className="text-amber-900">
                Unable to verify <code className="font-mono">/siteConfig/bootstrap</code>. Click{' '}
                <strong>Refresh Counts</strong> before running initial seeding.
              </p>
            </div>
          </div>
        ) : bootstrapMeta ? (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>{t.admin.bootstrapAlreadySeeded}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-950">
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-200/80">
                <span className="text-[11px] uppercase font-semibold text-emerald-700 block">
                  Version
                </span>
                <span className="font-mono font-bold">
                  {bootstrapMeta.version || BOOTSTRAP_VERSION}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-200/80">
                <span className="text-[11px] uppercase font-semibold text-emerald-700 block">
                  Seeded At
                </span>
                <span className="font-mono font-bold">{bootstrapMeta.seededAt}</span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-emerald-200/80">
                <span className="text-[11px] uppercase font-semibold text-emerald-700 block">
                  Seeded By
                </span>
                <span className="font-bold">{bootstrapMeta.seededBy}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-[#eff3ff] border border-[#d3e5f1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-[#121c2a]">
              <p className="font-bold flex items-center gap-1.5 text-[#006191]">
                <ShieldCheck className="w-4 h-4" />
                <span>Ready for One-Time Initial Seed (v{BOOTSTRAP_VERSION})</span>
              </p>
              <p className="text-[#566771]">
                Writes initial programs, campaigns, destinations, donation reports, board members,
                events, members (with certified vote weights), GA motions/inquiries, and locks{' '}
                <code className="font-mono">/siteConfig/bootstrap</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRunBootstrap()}
              disabled={isSeeding}
              className="px-5 py-2.5 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Seeding Firestore...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.admin.bootstrapRunAction}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Live Collection Document Counts */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#566771] mb-3">
            Live Firestore Collection Counts
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {INSPECTED_COLLECTIONS.map((colName) => (
              <div
                key={colName}
                className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#bec7d2]/60"
              >
                <span className="text-[11px] font-mono text-[#566771] block truncate">
                  /{colName}
                </span>
                <span className="text-xl font-bold text-[#121c2a] mt-1 block">
                  {statusLoading ? '—' : collectionCounts[colName] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
