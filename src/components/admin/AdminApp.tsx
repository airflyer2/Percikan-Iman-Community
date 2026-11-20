import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { checkBootstrapStatus } from '../../lib/firestoreBootstrap';
import { AdminDashboard } from '../AdminDashboard';
import { AdminMembersTab } from '../AdminMembersTab';
import { AdminAssemblyTab } from './AdminAssemblyTab';
import { AdminBootstrapPanel } from './AdminBootstrapPanel';
import { AdminEventsTab } from './AdminEventsTab';
import { AdminLayout } from './AdminLayout';
import {
  AdminRouteGuard,
  getFirstPermittedAdminPath,
  StaffRoleFlags
} from './AdminRouteGuard';

const LazyAdminAttendanceScanner = React.lazy(() =>
  import('../AdminEventAttendanceScanner').then((m) => ({
    default: m.AdminEventAttendanceScanner
  }))
);

const AdminChunkLoader: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="bg-white rounded-2xl border border-[#bec7d2]/60 p-10 flex flex-col items-center justify-center text-xs text-[#566771]"
  >
    <div className="w-8 h-8 border-3 border-[#006191] border-t-transparent rounded-full animate-spin mb-3" />
    <span>Loading scanner module...</span>
  </div>
);

const AdminIndexRedirect: React.FC = () => {
  const { currentUser } = useAuth();
  const roles: StaffRoleFlags = {
    isAdmin: currentUser?.isAdmin,
    isSuperAdmin: currentUser?.isSuperAdmin,
    canManageBoard: currentUser?.canManageBoard,
    canScanQR: currentUser?.canScanQR
  };
  return <Navigate to={getFirstPermittedAdminPath(roles)} replace />;
};

export const AdminApp: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      setIsBootstrapped(false);
      return;
    }

    let cancelled = false;
    checkBootstrapStatus()
      .then((meta) => {
        if (!cancelled) {
          setIsBootstrapped(Boolean(meta));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsBootstrapped(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  return (
    <AdminRouteGuard>
      <AdminLayout isBootstrapped={isBootstrapped}>
        <Routes>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="programs" element={<AdminDashboard activeTab="programs" />} />
          <Route path="events" element={<AdminEventsTab />} />
          <Route path="content" element={<AdminDashboard activeTab="content" />} />
          <Route path="board" element={<AdminDashboard activeTab="board" />} />
          <Route path="donations" element={<AdminDashboard activeTab="donations" />} />
          <Route path="members" element={<AdminMembersTab />} />
          <Route
            path="attendance"
            element={
              <Suspense fallback={<AdminChunkLoader />}>
                <LazyAdminAttendanceScanner />
              </Suspense>
            }
          />
          <Route path="assembly" element={<AdminAssemblyTab />} />
          <Route
            path="bootstrap"
            element={
              <AdminBootstrapPanel
                onBootstrapComplete={() => setIsBootstrapped(true)}
              />
            }
          />
          <Route path="*" element={<AdminIndexRedirect />} />
        </Routes>
      </AdminLayout>
    </AdminRouteGuard>
  );
};

export default AdminApp;
