import React from 'react'
import ReactDOM from 'react-dom/client'
import { keepFresh } from './lib/freshness.js'
import { prepareTheme } from './lib/brand.js'

keepFresh()

const path = window.location.pathname
const isStaffPath = path === '/staff' || path.startsWith('/staff/')
const isSignPath = path.startsWith('/sign/')
const isPayCallbackPath = path === '/pay/callback'
const isPayContractPath = path.startsWith('/pay/contract/')
const isApplicantPath = path === '/applicant' || path.startsWith('/applicant/')
const isVisitConfirmPath = path.startsWith('/confirm-visit/')
const isIdCardPath = path === '/id-card'
const isVerifyStaffPath = path.startsWith('/verify/staff/')

async function start() {
  // The website's brand colour is chosen before its code loads, so pages
  // render in the admin's theme from the first frame. The Staff Office keeps
  // its own look and doesn't wait for it.
  if (!isStaffPath && !isIdCardPath && !isVerifyStaffPath) await prepareTheme()

  let root
  if (isIdCardPath) {
    const IdCardPage = React.lazy(() => import('./pages/IdCardPage.jsx'))
    root = <React.Suspense fallback={null}><IdCardPage /></React.Suspense>
  } else if (isVerifyStaffPath) {
    const VerifyStaff = React.lazy(() => import('./pages/VerifyStaff.jsx'))
    root = <React.Suspense fallback={null}><VerifyStaff /></React.Suspense>
  } else if (isVisitConfirmPath) {
    const VisitConfirm = React.lazy(() => import('./pages/VisitConfirm.jsx'))
    root = <React.Suspense fallback={null}><VisitConfirm /></React.Suspense>
  } else if (isStaffPath) {
    const StaffApp = React.lazy(() => import('./staff/StaffApp.jsx'))
    root = <React.Suspense fallback={null}><StaffApp /></React.Suspense>
  } else if (isApplicantPath) {
    const ApplicantPortal = React.lazy(() => import('./pages/ApplicantPortal.jsx'))
    root = <React.Suspense fallback={null}><ApplicantPortal /></React.Suspense>
  } else if (isSignPath) {
    const SignContractPage = React.lazy(() => import('./pages/SignContractPage.jsx'))
    root = <React.Suspense fallback={null}><SignContractPage /></React.Suspense>
  } else if (isPayContractPath) {
    const PayContractPage = React.lazy(() => import('./pages/PayContractPage.jsx'))
    root = <React.Suspense fallback={null}><PayContractPage /></React.Suspense>
  } else if (isPayCallbackPath) {
    const PaymentCallbackPage = React.lazy(() => import('./pages/PaymentCallbackPage.jsx'))
    root = <React.Suspense fallback={null}><PaymentCallbackPage /></React.Suspense>
  } else {
    const { default: App } = await import('./App')
    root = <App />
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      {root}
    </React.StrictMode>,
  )
}

start()
