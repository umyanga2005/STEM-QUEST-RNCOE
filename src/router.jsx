/* oxlint-disable react/only-export-components -- router config mixes component and config exports */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

const RoutePlaceholder = lazy(() => import('./pages/RoutePlaceholder.jsx'))

const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage.jsx'))
const StudentMissionPage = lazy(() => import('./pages/StudentMissionPage.jsx'))
const StudentGamePage = lazy(() => import('./pages/StudentGamePage.jsx'))
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage.jsx'))
const StudentAchievementsPage = lazy(() => import('./pages/StudentAchievementsPage.jsx'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage.jsx'))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx'))
const AdminShell = lazy(() => import('./pages/AdminShell.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'))
const AdminQuestionsPage = lazy(() => import('./pages/AdminQuestionsPage.jsx'))
const AdminQuestionEditorPage = lazy(() => import('./pages/AdminQuestionEditorPage.jsx'))
const AdminReviewQueuePage = lazy(() => import('./pages/AdminReviewQueuePage.jsx'))
const AdminReviewDetailPage = lazy(() => import('./pages/AdminReviewDetailPage.jsx'))

const AdminStudentsPage = lazy(() => import('./pages/AdminStudentsPage.jsx'))
const AdminProgressPage = lazy(() => import('./pages/AdminProgressPage.jsx'))
const AdminLeaderboardsPage = lazy(() => import('./pages/AdminLeaderboardsPage.jsx'))
const AdminAchievementsPage = lazy(() => import('./pages/AdminAchievementsPage.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage.jsx'))

const AdminAuthProvider = lazy(() => import('./features/admin-auth/auth/admin-auth-provider.jsx'))

import StudentNav from './components/StudentNav.jsx'
import { StemLoader } from './components/StemLoader/StemLoader.jsx'

const withFallback = (element) => (
  <Suspense fallback={<StemLoader overlay label="Loading…" />}>
    {element}
    <StudentNav />
  </Suspense>
)

const withAdminFallback = (element) => (
  <Suspense fallback={<StemLoader overlay label="Loading…" />}>
    {element}
  </Suspense>
)

export const APP_ROUTES = [
  {
    path: '/student/register',
    title: 'Student Registration',
    description: 'Sign-up / login flow for students.',
    component: <StudentRegisterPage />,
  },
  {
    path: '/student/mission',
    title: 'Student Mission',
    description: 'Stream and level selection before a mission.',
    component: <StudentMissionPage />,
  },
  {
    path: '/student/game',
    title: 'Student Game',
    description: 'Game-session screen for students.',
    component: <StudentGamePage />,
  },
  {
    path: '/student/profile',
    title: 'Student Profile & Progress',
    description: 'Profile and progress dashboard for students.',
    component: <StudentProfilePage />,
  },
  {
    path: '/student/achievements',
    title: 'Student Achievements',
    description: 'Badges and certificates earned by the student.',
    component: <StudentAchievementsPage />,
  },
  {
    path: '/leaderboards',
    title: 'Live Leaderboards',
    description: 'Live top-10 scores across the four STEM streams.',
    component: <LeaderboardPage />,
  },
  {
    path: '/certificate',
    title: 'Certificate',
    description: 'Certificate view for completed sessions.',
  },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/student/register" replace />,
  },
  {
    path: '/student',
    element: <Navigate to="/student/register" replace />, // FIX: P3-001
  },
  ...APP_ROUTES.map(({ path, title, description, component }) => ({
    path,
    element: component
      ? withFallback(component)
      : withFallback(<RoutePlaceholder title={title} description={description} path={path} />),
  })),
  {
    path: '/admin/login',
    element: withAdminFallback(
      <AdminAuthProvider>
        <AdminLoginPage />
      </AdminAuthProvider>
    ),
  },
  {
    path: '/admin',
    element: withAdminFallback(
      <AdminAuthProvider>
        <AdminShell />
      </AdminAuthProvider>
    ),
    children: [
      { index: true, element: withAdminFallback(<AdminDashboardPage />) },
      { path: 'questions', element: withAdminFallback(<AdminQuestionsPage />) },
      { path: 'questions/review', element: withAdminFallback(<AdminReviewQueuePage />) },
      { path: 'questions/:id/review', element: withAdminFallback(<AdminReviewDetailPage />) },
      { path: 'questions/new', element: withAdminFallback(<AdminQuestionEditorPage />) },
      { path: 'questions/:id/edit', element: withAdminFallback(<AdminQuestionEditorPage />) },
      { path: 'students', element: withAdminFallback(<AdminStudentsPage />) },
      { path: 'progress', element: withAdminFallback(<AdminProgressPage />) },
      { path: 'leaderboards', element: withAdminFallback(<AdminLeaderboardsPage />) },
      { path: 'achievements', element: withAdminFallback(<AdminAchievementsPage />) },
      { path: 'settings', element: withAdminFallback(<AdminSettingsPage />) },
    ],
  },
  {
    path: '*',
    element: withFallback(
      <RoutePlaceholder
        title="Page not found"
        description="This route does not exist yet."
        path="*"
      />,
    ),
  },
])