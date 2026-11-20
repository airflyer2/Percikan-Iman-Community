/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useInRouterContext
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './i18n';
import { PublicLayout, normalizeScreenToPath, usePublicLayout } from './components/PublicLayout';
import { HomeView } from './components/HomeView';
import { ProgramsView } from './components/ProgramsView';
import { DonateView } from './components/DonateView';
import { GalleryView } from './components/GalleryView';
import { AboutView, ContactView } from './components/AboutContactViews';
import { BrandStyleguideView } from './components/BrandStyleguideView';
import { AuthView } from './components/AuthView';
import { MemberProfileView } from './components/MemberProfileView';
import { GeneralAssemblyView } from './components/GeneralAssemblyView';

const LazyAdminApp = React.lazy(() => import('./components/admin/AdminApp'));

const HomeRoute: React.FC = () => {
  const location = useLocation();
  if (location.hash === '#brand') {
    return <Navigate to="/brand" replace />;
  }
  return <HomeView />;
};

const AboutRoute: React.FC = () => {
  const layout = usePublicLayout();
  return <AboutView onOpenStatuten={layout?.onOpenStatuten} />;
};

const BrandRoute: React.FC = () => {
  const navigate = useNavigate();
  return <BrandStyleguideView onNavigate={(screen) => navigate(normalizeScreenToPath(screen))} />;
};

const AuthRoute: React.FC = () => {
  const layout = usePublicLayout();
  return (
    <AuthView
      onOpenModal={(type) => layout?.onOpenModal(type)}
    />
  );
};

const MemberRoute: React.FC = () => {
  const layout = usePublicLayout();
  return <MemberProfileView onOpenStatuten={layout?.onOpenStatuten} />;
};

const AssemblyRoute: React.FC = () => {
  const layout = usePublicLayout();
  return <GeneralAssemblyView onOpenStatuten={layout?.onOpenStatuten} />;
};

const AdminLoadingFallback: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-[#EAE6DF] text-[#132435]"
    role="status"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-[#1D5B8C] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-[#4A5E72]">Loading administration workspace...</p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/programs" element={<ProgramsView />} />
        <Route path="/donate" element={<DonateView />} />
        <Route path="/gallery" element={<GalleryView />} />
        <Route path="/about" element={<AboutRoute />} />
        <Route path="/contact" element={<ContactView />} />
        <Route path="/brand" element={<BrandRoute />} />
        <Route path="/login" element={<AuthRoute />} />
        <Route path="/member" element={<MemberRoute />} />
        <Route path="/assembly" element={<AssemblyRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<AdminLoadingFallback />}>
            <LazyAdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default function App() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <AppRoutes />;
  }

  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
