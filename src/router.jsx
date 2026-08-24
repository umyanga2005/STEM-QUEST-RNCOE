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
const AdminPlaceholderPage = lazy(() => import('./pages/AdminPlaceholderPage.jsx'))
const AdminAuthProvider = lazy(() => import('./features/admin-auth/auth/admin-auth-provider.jsx'))

import StudentNav from './components/StudentNav.jsx'

const withFallback = (element) => (
  <Suspense fallback={<div />}>
    {element}
    <StudentNav />
  </Suspense>
)

export const APP_ROUTES = [
  {
    path: '/student/register',
    title: 'Student Registration',
    description: 'Future sign-up / login flow for students.',
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
    description: 'Future certificate view for completed sessions.',
  },
]

const admin = (title, description) => (
  <AdminPlaceholderPage title={title} description={description} />
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/student/register" replace />,
  },
  ...APP_ROUTES.map(({ path, title, description, component }) => ({
    path,
    element: component
      ? withFallback(component)
      : withFallback(<RoutePlaceholder title={title} description={description} path={path} />),
  })),
  {
    path: '/admin/login',
    element: withFallback(
      <AdminAuthProvider>
        <AdminLoginPage />
      </AdminAuthProvider>
    ),
  },
  {
    path: '/admin',
    element: withFallback(
      <AdminAuthProvider>
        <AdminShell />
      </AdminAuthProvider>
    ),
    children: [
      { index: true, element: withFallback(<AdminDashboardPage />) },
      { path: 'questions', element: withFallback(<AdminQuestionsPage />) },
      { path: 'questions/review', element: withFallback(<AdminReviewQueuePage />) },
      { path: 'questions/:id/review', element: withFallback(<AdminReviewDetailPage />) },
      { path: 'questions/new', element: withFallback(<AdminQuestionEditorPage />) },
      { path: 'questions/:id/edit', element: withFallback(<AdminQuestionEditorPage />) },
      { path: 'students', element: withFallback(admin('Students', 'Browse, search and manage student accounts. Coming soon.')) },
      { path: 'progress', element: withFallback(admin('Progress', 'Track student progress and level completions. Coming soon.')) },
      { path: 'leaderboards', element: withFallback(admin('Leaderboards', 'Review leaderboard rankings and best scores. Coming soon.')) },
      { path: 'achievements', element: withFallback(admin('Badges & Certificates', 'Review badges and manage certificate revocation. Coming soon.')) },
      { path: 'settings', element: withFallback(admin('Settings', 'Configure the STEM QUEST experience. Coming soon.')) },
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