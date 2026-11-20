import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityEvent, UserAccount } from '../src/types';

type SnapshotCallback = (snapshot: {
  metadata?: { fromCache?: boolean };
  docs: Array<{ id: string; data: () => UserAccount }>;
}) => void;

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, path: string) => ({ path }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  collection: (db: unknown, path: string) => mockCollection(db, path),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args)
}));

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: vi.fn(() => ({ db: { kind: 'mock-db' }, auth: {} })),
  getFirebaseOptions: vi.fn(() => null),
  isFirebaseConfigured: vi.fn(() => true),
  googleProvider: {}
}));

import { subscribeToFirestoreMembers } from '../src/lib/authService';
import { formatLocalIsoDate, selectNextEvent } from '../src/components/HomeView';
import { getLocalTodayParts } from '../src/components/EventCalendar';

describe('Tier 3 Fixes: subscribeToFirestoreMembers cache-race & event date helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes includeMetadataChanges: true and skips fromCache snapshots before server sync', () => {
    let capturedOnNext: SnapshotCallback | null = null;
    const unsubMock = vi.fn();
    mockOnSnapshot.mockImplementation(
      (
        _colRef: unknown,
        options: { includeMetadataChanges?: boolean },
        onNext: SnapshotCallback
      ) => {
        expect(options).toEqual({ includeMetadataChanges: true });
        capturedOnNext = onNext;
        return unsubMock;
      }
    );

    const received: UserAccount[][] = [];
    const unsub = subscribeToFirestoreMembers((list) => received.push(list));

    expect(mockCollection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'members');
    expect(capturedOnNext).not.toBeNull();

    // 1. Partial cached snapshot containing only [admin] must be skipped
    capturedOnNext!({
      metadata: { fromCache: true },
      docs: [
        {
          id: 'uid-admin',
          data: () => ({
            name: 'Admin User',
            email: 'admin@percikaniman.org',
            isAdmin: true
          })
        }
      ]
    });
    expect(received).toHaveLength(0);

    // 2. Authoritative server snapshot containing all members is emitted
    capturedOnNext!({
      metadata: { fromCache: false },
      docs: [
        {
          id: 'uid-admin',
          data: () => ({
            name: 'Admin User',
            email: 'admin@percikaniman.org',
            isAdmin: true
          })
        },
        {
          id: 'uid-member',
          data: () => ({
            name: 'Member User',
            email: 'member@percikaniman.org'
          })
        }
      ]
    });
    expect(received).toHaveLength(1);
    expect(received[0].map((m) => m.uid)).toEqual(['uid-admin', 'uid-member']);

    unsub();
    expect(unsubMock).toHaveBeenCalledTimes(1);
  });

  it('selectNextEvent picks the first upcoming event >= todayIso and falls back to latest past event', () => {
    const sampleEvents: CommunityEvent[] = [
      {
        id: 'evt-past-1',
        title: 'May Lecture',
        date: '2026-05-14',
        time: '18:00',
        category: 'Majelis & Spiritual',
        location: 'Zürich',
        description: 'Past 1'
      },
      {
        id: 'evt-past-2',
        title: 'September Pengajian',
        date: '2026-09-13',
        time: '13:00',
        category: 'Majelis & Spiritual',
        location: 'Stadelhofen',
        description: 'Past 2'
      },
      {
        id: 'evt-future-1',
        title: 'November Symposium',
        date: '2026-11-22',
        time: '14:00',
        category: 'Community Gathering',
        location: 'Zürich',
        description: 'Future 1'
      }
    ];

    expect(selectNextEvent(sampleEvents, '2026-11-19')?.id).toBe('evt-future-1');
    expect(selectNextEvent(sampleEvents, '2026-11-22')?.id).toBe('evt-future-1');
    expect(selectNextEvent(sampleEvents, '2026-12-01')?.id).toBe('evt-future-1');
    expect(selectNextEvent(sampleEvents.slice(0, 2), '2026-11-19')?.id).toBe('evt-past-2');
    expect(selectNextEvent([], '2026-11-19')).toBeUndefined();
  });

  it('formatLocalIsoDate and getLocalTodayParts format local calendar date without UTC shift', () => {
    const localLateEvening = new Date(2026, 10, 19, 23, 45, 0); // Nov 19, 2026 23:45 local
    expect(formatLocalIsoDate(localLateEvening)).toBe('2026-11-19');
    expect(getLocalTodayParts(localLateEvening)).toEqual({
      year: 2026,
      month: 10,
      dateStr: '2026-11-19'
    });
  });
});
