import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n';
import type { SiteNotice } from '../src/types';

type SiteNoticeRes = {
  data: SiteNotice | null;
  loading: boolean;
  error: string | null;
};

let capturedSiteNoticeCb: ((res: SiteNoticeRes) => void) | null = null;
const mockSaveSiteNotice = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'authenticated',
    currentUser: {
      uid: 'uid-admin',
      name: 'Board Admin',
      email: 'admin@percikaniman.org',
      memberCode: 'PI-ADMIN-1',
      membershipCategory: 'personal',
      membershipStatus: 'active',
      isAdmin: true
    },
    firebaseUser: null,
    hasFullAdmin: true,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    hasAnyStaffRole: true,
    signOut: vi.fn()
  })
}));

vi.mock('../src/lib/firestoreContent', () => ({
  subscribePrograms: vi.fn(() => () => {}),
  subscribeCampaigns: vi.fn((cb: (res: { data: unknown[]; loading: boolean; error: string | null }) => void) => {
    cb({ data: [], loading: false, error: null });
    return () => {};
  }),
  subscribeDestinations: vi.fn((cb: (res: { data: unknown[]; loading: boolean; error: string | null }) => void) => {
    cb({ data: [], loading: false, error: null });
    return () => {};
  }),
  subscribeBoardMembers: vi.fn(() => () => {}),
  subscribeSiteNotice: vi.fn((cb: (res: SiteNoticeRes) => void) => {
    capturedSiteNoticeCb = cb;
    cb({ data: null, loading: true, error: null });
    return () => {
      capturedSiteNoticeCb = null;
    };
  }),
  saveProgram: vi.fn(),
  deleteProgram: vi.fn(),
  saveCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  saveDestination: vi.fn(),
  deleteDestination: vi.fn(),
  saveBoardMember: vi.fn(),
  deleteBoardMember: vi.fn(),
  saveSiteNotice: (...args: unknown[]) => mockSaveSiteNotice(...args),
  formatFirestoreError: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
  isValidFirestoreImageUrl: () => true,
  normalizeSafeHttpUrl: (url: string) => url.trim()
}));

vi.mock('../src/lib/firestoreDonations', () => ({
  subscribeDonationPledges: vi.fn(() => () => {}),
  subscribeDonationReports: vi.fn(() => () => {}),
  createManualDonationReport: vi.fn(),
  promotePledgeToReport: vi.fn(),
  rejectDonationPledge: vi.fn()
}));

import { AdminDashboard } from '../src/components/AdminDashboard';

describe('AdminDashboard SiteNotice hydration and dirty-edit protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSiteNoticeCb = null;
    mockSaveSiteNotice.mockImplementation(async (notice: SiteNotice) => notice);
  });

  afterEach(() => {
    cleanup();
  });

  it('gates SiteNotice inputs while loading, hydrates from snapshot, and prevents snapshot overwrite while dirty', async () => {
    render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    // 1. Form inputs must NOT render while subscribeSiteNotice is still loading
    expect(screen.getByText(/Loading site announcement settings/i)).toBeInTheDocument();
    expect(document.querySelector('input[name="badge"]')).toBeNull();
    expect(document.querySelector('input[name="message"]')).toBeNull();
    expect(capturedSiteNoticeCb).not.toBeNull();

    // 2. Initial Firestore snapshot resolves
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Generalversammlung 2026',
          message: 'Die ordentliche Generalversammlung findet am 15. September 2026 in Zürich statt.'
        },
        loading: false,
        error: null
      });
    });

    const badgeInput = document.querySelector('input[name="badge"]') as HTMLInputElement;
    const messageInput = document.querySelector('input[name="message"]') as HTMLInputElement;
    const enabledCheckbox = screen.getByLabelText(/Enable Notice Banner/i) as HTMLInputElement;

    expect(badgeInput).not.toBeNull();
    expect(messageInput).not.toBeNull();
    expect(enabledCheckbox.checked).toBe(true);
    expect(badgeInput.value).toBe('Generalversammlung 2026');
    expect(messageInput.value).toBe(
      'Die ordentliche Generalversammlung findet am 15. September 2026 in Zürich statt.'
    );

    // 3. User edits both inputs (form becomes dirty)
    fireEvent.change(badgeInput, { target: { value: 'Dringender Saalwechsel Zürich' } });
    fireEvent.change(messageInput, {
      target: { value: 'Bitte beachten Sie den neuen Raum in Zürich.' }
    });

    expect(badgeInput.value).toBe('Dringender Saalwechsel Zürich');
    expect(messageInput.value).toBe('Bitte beachten Sie den neuen Raum in Zürich.');

    // 4. Subsequent background snapshot must NOT clobber dirty edits
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Generalversammlung 2026',
          message: 'Die ordentliche Generalversammlung findet am 15. September 2026 in Zürich statt.'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('Dringender Saalwechsel Zürich');
    expect(messageInput.value).toBe('Bitte beachten Sie den neuen Raum in Zürich.');

    // 5. Saving calls saveSiteNotice with edited values and preserved enabled: true
    fireEvent.click(screen.getByRole('button', { name: /Save Banner Settings/i }));

    await waitFor(() => {
      expect(mockSaveSiteNotice).toHaveBeenCalledTimes(1);
    });
    expect(mockSaveSiteNotice).toHaveBeenCalledWith({
      enabled: true,
      badge: 'Dringender Saalwechsel Zürich',
      message: 'Bitte beachten Sie den neuen Raum in Zürich.',
      linkText: undefined,
      linkScreen: undefined
    });

    // 6. After save succeeds, isNoticeDirty resets so subsequent external snapshots sync again
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Synced After Save',
          message: 'New external update'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('Synced After Save');
    expect(messageInput.value).toBe('New external update');
  });

  it('falls back to DEFAULT_NOTICE when siteConfig/notice document does not exist', () => {
    render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    act(() => {
      capturedSiteNoticeCb!({
        data: null,
        loading: false,
        error: null
      });
    });

    const badgeInput = document.querySelector('input[name="badge"]') as HTMLInputElement;
    const messageInput = document.querySelector('input[name="message"]') as HTMLInputElement;
    const enabledCheckbox = screen.getByLabelText(/Enable Notice Banner/i) as HTMLInputElement;

    expect(enabledCheckbox.checked).toBe(false);
    expect(badgeInput.value).toBe('Announcement');
    expect(messageInput.value).toBe('');
  });

  it('3C: preserves saved notice values immediately when saveSiteNotice resolves before any subsequent onSnapshot arrives', async () => {
    render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Old Badge',
          message: 'Old Message'
        },
        loading: false,
        error: null
      });
    });

    const badgeInput = document.querySelector('input[name="badge"]') as HTMLInputElement;
    const messageInput = document.querySelector('input[name="message"]') as HTMLInputElement;

    expect(badgeInput.value).toBe('Old Badge');
    expect(messageInput.value).toBe('Old Message');

    fireEvent.change(badgeInput, { target: { value: 'New Saved Badge' } });
    fireEvent.change(messageInput, { target: { value: 'New Saved Message' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Banner Settings/i }));

    await waitFor(() => {
      expect(screen.getByText(/Changes Published Live/i)).toBeInTheDocument();
    });

    // Must NOT revert to 'Old Badge' / 'Old Message' before onSnapshot fires
    expect(badgeInput.value).toBe('New Saved Badge');
    expect(messageInput.value).toBe('New Saved Message');

    // Subsequent snapshot with the saved payload keeps the same values
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'New Saved Badge',
          message: 'New Saved Message'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('New Saved Badge');
    expect(messageInput.value).toBe('New Saved Message');

    // Subsequent external snapshot syncs now that dirty state has been cleared
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: false,
          badge: 'External Update',
          message: 'External Message'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('External Update');
    expect(messageInput.value).toBe('External Message');
  });

  it('3D: preserves edits typed while saveSiteNotice is in flight and blocks stale post-save snapshot overwrite', async () => {
    let resolveInFlightSave!: (value: SiteNotice) => void;
    mockSaveSiteNotice.mockImplementationOnce(
      () =>
        new Promise<SiteNotice>((resolve) => {
          resolveInFlightSave = resolve;
        })
    );

    render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Initial',
          message: 'Initial Msg'
        },
        loading: false,
        error: null
      });
    });

    const badgeInput = document.querySelector('input[name="badge"]') as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: /Save Banner Settings/i }) as HTMLButtonElement;

    fireEvent.change(badgeInput, { target: { value: 'Draft 1' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSiteNotice).toHaveBeenCalledTimes(1);
      expect(saveButton.disabled).toBe(true);
    });

    // User edits badge while the first save is still in flight
    fireEvent.change(badgeInput, { target: { value: 'Draft 2' } });
    expect(badgeInput.value).toBe('Draft 2');

    // First save ('Draft 1') resolves
    await act(async () => {
      resolveInFlightSave({
        enabled: true,
        badge: 'Draft 1',
        message: 'Initial Msg'
      });
    });

    await waitFor(() => {
      expect(saveButton.disabled).toBe(false);
    });

    // Draft 2 must NOT be overwritten by 'Initial' or 'Draft 1'
    expect(badgeInput.value).toBe('Draft 2');

    // Echo snapshot for 'Draft 1' arrives while 'Draft 2' is still dirty -> must remain 'Draft 2'
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Draft 1',
          message: 'Initial Msg'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('Draft 2');

    // Saving Draft 2 clears dirty state once no newer edits occurred during save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSiteNotice).toHaveBeenCalledTimes(2);
      expect(saveButton.disabled).toBe(false);
    });
    expect(mockSaveSiteNotice).toHaveBeenLastCalledWith({
      enabled: true,
      badge: 'Draft 2',
      message: 'Initial Msg',
      linkText: undefined,
      linkScreen: undefined
    });

    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Post Draft 2 Sync',
          message: 'Initial Msg'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('Post Draft 2 Sync');
  });

  it('keeps dirty state intact if saveSiteNotice rejects so unsaved edits are not clobbered by snapshots', async () => {
    mockSaveSiteNotice.mockRejectedValueOnce(new Error('Permission denied'));

    render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Initial',
          message: 'Initial Msg'
        },
        loading: false,
        error: null
      });
    });

    const badgeInput = document.querySelector('input[name="badge"]') as HTMLInputElement;
    fireEvent.change(badgeInput, { target: { value: 'Unsaved Draft' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Banner Settings/i }));

    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
    });

    expect(badgeInput.value).toBe('Unsaved Draft');

    // Subsequent snapshot must NOT overwrite unsaved edits after failed save
    act(() => {
      capturedSiteNoticeCb!({
        data: {
          enabled: true,
          badge: 'Initial',
          message: 'Initial Msg'
        },
        loading: false,
        error: null
      });
    });

    expect(badgeInput.value).toBe('Unsaved Draft');
  });
});
