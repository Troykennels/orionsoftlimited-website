import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const path = window.location.pathname
const isStaffPath = path === '/staff' || path.startsWith('/staff/')
const isSignPath = path.startsWith('/sign/')
const isPayCallbackPath = path === '/pay/callback'
const isApplicantPath = path === '/applicant' || path.startsWith('/applicant/')

const StaffApp = isStaffPath ? React.lazy(() => import('./staff/StaffApp.jsx')) : null
const SignContractPage = isSignPath ? React.lazy(() => import('./pages/SignContractPage.jsx')) : null
const PaymentCallbackPage = isPayCallbackPath ? React.lazy(() => import('./pages/PaymentCallbackPage.jsx')) : null
const ApplicantPortal = isApplicantPath ? React.lazy(() => import('./pages/ApplicantPortal.jsx')) : null

let root
if (isStaffPath) {
  root = <React.Suspense fallback={null}><StaffApp /></React.Suspense>
} else if (isApplicantPath) {
  root = <React.Suspense fallback={null}><ApplicantPortal /></React.Suspense>
} else if (isSignPath) {
  root = <React.Suspense fallback={null}><SignContractPage /></React.Suspense>
} else if (isPayCallbackPath) {
  root = <React.Suspense fallback={null}><PaymentCallbackPage /></React.Suspense>
} else {
  root = <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {root}
  </React.StrictMode>,
)
