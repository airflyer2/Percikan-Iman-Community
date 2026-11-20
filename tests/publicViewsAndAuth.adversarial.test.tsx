import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n';
import type {
  Campaign,
  CommunityEvent,
  ContributionDestination,
  Program
} from '../src/types';

const mockSubmitDonationPledge = vi.fn();
const mockSignInMember = vi.fn();
const mockSubscribeCampaigns = vi.fn();
const mockSubscribeDestinations = vi.fn();
const mockSubscribePrograms = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'unauthenticated',
    currentUser: null,
    firebaseUser: null,
    hasFullAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    hasAnyStaffRole: false,
    signOut: vi.fn()
  })
}));

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: () => null,
  getFirebaseOptions: () => null,
  isFirebaseConfigured: () => false,
  saveRuntimeFirebaseConfig: vi.fn(),
  clearRuntimeFirebaseConfig: vi.fn(),
  googleProvider: {}
}));

vi.mock('../src/lib/authService', () => ({
  signInMember: (...args: unknown[]) => mockSignInMember(...args),
  registerMember: vi.fn(),
  authenticateWithGoogle: vi.fn(),
  completeGoogleMemberRegistration: vi.fn(),
  sendMemberPasswordReset: vi.fn(),
  validatePasswordStrength: (pw: string) =>
    !pw || pw.length < 6 ? 'Password must be at least 6 characters long.' : null,
  isFirebaseConfigured: () => false,
  isEmulatorMode: () => false
}));

vi.mock('../src/lib/firestoreDonations', () => ({
  submitDonationPledge: (...args: unknown[]) => mockSubmitDonationPledge(...args)
}));

vi.mock('../src/lib/firestoreContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/firestoreContent')>();
  return {
    ...actual,
    subscribeCampaigns: (cb: (res: { data: Campaign[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeCampaigns(cb),
    subscribeDestinations: (cb: (res: { data: ContributionDestination[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeDestinations(cb),
    subscribePrograms: (cb: (res: { data: Program[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribePrograms(cb),
    subscribeSiteNotice: vi.fn(() => () => {})
  };
});

import { DonateView } from '../src/components/DonateView';
import { AuthView } from '../src/components/AuthView';
import { ProgramsView } from '../src/components/ProgramsView';
import { EventCalendar } from '../src/components/EventCalendar';
import { PhotoUpload } from '../src/components/PhotoUpload';
import { normalizeScreenToPath } from '../src/components/PublicLayout';

describe('Public Views & Auth Adversarial Suite (T14–T18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeCampaigns.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeDestinations.mockImplementation((cb) => {
      cb({
        data: [
          {
            id: 'dest-1',
            name: 'INFAQ & Vereinsbetrieb',
            shortLabel: 'Infaq',
            category: 'General',
            description: 'General fund'
          }
        ],
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribePrograms.mockImplementation((cb) => {
      cb({
        data: [
          {
            id: 'prog-health',
            title: 'Community Health Screening',
            category: 'Health',
            tag: 'Health',
            iconName: 'medical_services',
            description: 'Free annual screening',
            imageUrl: 'https://example.com/health.jpg',
            dateOrSchedule: 'Quarterly',
            location: 'Zürich',
            detailedOverview: 'Details'
          },
          {
            id: 'prog-rel',
            title: 'Monthly Pengajian',
            category: 'Religious',
            tag: 'Monthly',
            iconName: 'mosque',
            description: 'Spiritual gathering',
            imageUrl: 'https://example.com/rel.jpg',
            dateOrSchedule: 'Monthly',
            location: 'Bern',
            detailedOverview: 'Details'
          }
        ],
        loading: false,
        error: null
      });
      return () => {};
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('T14: DonateView blocks double-submit and resets donor form when receipt modal closes', async () => {
    let resolvePledge!: (val: { id: string; donorName: string; amount: number; destination: string }) => void;
    mockSubmitDonationPledge.mockImplementation(
      () =>
        new Promise((res) => {
          resolvePledge = res;
        })
    );

    render(
      <LanguageProvider>
        <DonateView />
      </LanguageProvider>
    );

    const nameInput = document.querySelector('#donor-full-name') as HTMLInputElement;
    const emailInput = document.querySelector('#donor-email') as HTMLInputElement;
    const form = nameInput.closest('form')!;

    fireEvent.change(nameInput, { target: { value: 'Donor Test' } });
    fireEvent.change(emailInput, { target: { value: 'donor@example.ch' } });

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockSubmitDonationPledge).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePledge({
        id: 'PI-TEST-1',
        donorName: 'Donor Test',
        amount: 50,
        destination: 'INFAQ & Vereinsbetrieb'
      });
    });

    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(dlg).getByRole('button'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
  });

  it('T15: AuthView blocks synchronous double-submit on login', async () => {
    let resolveLogin!: (u: { name: string }) => void;
    mockSignInMember.mockImplementation(
      () =>
        new Promise((res) => {
          resolveLogin = res;
        })
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LanguageProvider>
          <AuthView />
        </LanguageProvider>
      </MemoryRouter>
    );

    const idInput = document.querySelector('#login_identifier') as HTMLInputElement;
    const pwInput = document.querySelector('#login_password') as HTMLInputElement;
    const form = idInput.closest('form')!;

    fireEvent.change(idInput, { target: { value: 'member@percikaniman.org' } });
    fireEvent.change(pwInput, { target: { value: 'Secret123!' } });

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockSignInMember).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin({ name: 'Member' });
    });
    await waitFor(() => {
      expect(mockSignInMember).toHaveBeenCalledTimes(1);
    });
  });

  it('T16: ProgramsView includes Health/Transparency/Community filter pills and resets registrationSubmitted across modal reopen', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ProgramsView />
        </LanguageProvider>
      </MemoryRouter>
    );

    const healthPill = screen.getByRole('button', { name: 'Health' });
    expect(screen.getByRole('button', { name: 'Transparency' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Community' })).toBeInTheDocument();

    fireEvent.click(healthPill);
    expect(screen.getByText('Community Health Screening')).toBeInTheDocument();
    expect(screen.queryByText('Monthly Pengajian')).toBeNull();

    // Open modal, submit registration, immediately close before 2000ms timeout, reopen -> must be fresh form!
    fireEvent.click(screen.getByRole('button', { name: /Details/i }));
    const dlg = screen.getByRole('dialog');
    const regForm = dlg.querySelector('form')!;
    fireEvent.submit(regForm);
    expect(within(dlg).getByRole('status')).toBeInTheDocument();

    fireEvent.click(within(dlg).getByRole('button', { name: /Close program details/i }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Details/i }));
    const reopened = screen.getByRole('dialog');
    expect(within(reopened).queryByRole('status')).toBeNull();
    expect(reopened.querySelector('form')).not.toBeNull();
  });

  it('T17: EventCalendar handles missing optional fields without crashing; PhotoUpload rejects SVG and avoids nested <form>', () => {
    const eventsWithMissingFields: CommunityEvent[] = [
      {
        id: 'evt-nodeps',
        title: 'No Description Event',
        date: '2026-11-19',
        time: '12:00',
        category: 'Community Gathering',
        location: undefined as unknown as string,
        description: undefined as unknown as string
      }
    ];

    render(
      <MemoryRouter>
        <LanguageProvider>
          <EventCalendar events={eventsWithMissingFields} />
        </LanguageProvider>
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search event, speaker, venue/i);
    expect(() => {
      fireEvent.change(searchInput, { target: { value: 'No Description' } });
    }).not.toThrow();

    cleanup();

    // PhotoUpload inside a parent <form>: must have zero nested <form> elements and reject SVG
    const onChangeSpy = vi.fn();
    const { container } = render(
      <form>
        <PhotoUpload id="pu-test" value="" onChange={onChangeSpy} allowUrlInput={true} />
      </form>
    );

    const fileInput = document.querySelector('#pu-test-file-input') as HTMLInputElement;
    expect(fileInput.accept).not.toContain('svg');

    const svgFile = new File(['<svg></svg>'], 'bad.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput, { target: { files: [svgFile] } });
    expect(screen.getByText(/Only raster image files/i)).toBeInTheDocument();
    expect(onChangeSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Paste external image URL instead/i }));
    expect(container.querySelectorAll('form')).toHaveLength(1);
  });

  it('T18: PublicLayout.normalizeScreenToPath blocks admin/unknown screens and maps valid public screens', () => {
    expect(normalizeScreenToPath('admin')).toBe('/');
    expect(normalizeScreenToPath('unknown-route')).toBe('/');
    expect(normalizeScreenToPath('home')).toBe('/');
    expect(normalizeScreenToPath('auth')).toBe('/login');
    expect(normalizeScreenToPath('programs')).toBe('/programs');
    expect(normalizeScreenToPath('gallery')).toBe('/gallery');
    expect(normalizeScreenToPath('brand')).toBe('/');
    expect(normalizeScreenToPath('assembly')).toBe('/assembly');
  });
});
