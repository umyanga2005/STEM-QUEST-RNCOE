/* oxlint-disable react/only-export-components -- router config mixes component and config exports */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import App from './App.jsx'

const RoutePlaceholder = lazy(() => import('./pages/RoutePlaceholder.jsx'))
const StudentRegisterPage = lazy(() => import('./pages/StudentRegisterPage.jsx'))

const withFallback = (element) => <Suspense fallback={<div />}>{element}</Suspense>

export const APP_ROUTES = [
  {
    path: '/student/register',
    title: 'Student Registration',
    description: 'Future sign-up / login flow for students.',
    component: <StudentRegisterPage />,
  },
  {
    path: '/student/game',
    title: 'Student Game',
    description: 'Future game-session screen for students.',
  },
  {
    path: '/leaderboards',
    title: 'Leaderboards',
    description: 'Future rankings screen.',
  },
  {
    path: '/certificate',
    title: 'Certificate',
    description: 'Future certificate view for completed sessions.',
  },
  {
    path: '/admin/login',
    title: 'Admin Login',
    description: 'Future administrator authentication screen.',
  },
  {
    path: '/admin',
    title: 'Admin Dashboard',
    description: 'Future administrator overview screen.',
  },
  {
    path: '/admin/questions',
    title: 'Question Builder',
    description: 'Future question-builder screen for administrators.',
  },
  {
    path: '/admin/settings',
    title: 'Admin Settings',
    description: 'Future administrator settings screen.',
  },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  ...APP_ROUTES.map(({ path, title, description, component }) => ({
    path,
    element: component
      ? withFallback(component)
      : withFallback(<RoutePlaceholder title={title} description={description} path={path} />),
  })),
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