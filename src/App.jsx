import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/auth/Login'

// Inquiry Portal & sub‑pages
import InquiryPortal from './pages/inquiries/InquiryPortal'
import InquiryDashboard from './pages/inquiries/InquiryDashboard'
import InquiryList from './pages/inquiries/InquiryList'
import InquiryForm from './pages/inquiries/InquiryForm'
import InquiryDetail from './pages/inquiries/InquiryDetail'
import InquiryEdit from './pages/inquiries/InquiryEdit'
import DemoList from './pages/inquiries/DemoList'
import DemoDetail from './pages/inquiries/DemoDetail'
import InquiryJourney from './pages/inquiries/InquiryJourney'

// Reports (inside the portal)
import ReportsList from './pages/reports/ReportsList'
import ReportPage from './pages/reports/ReportPage'

// Organization settings
import OrganizationEdit from './pages/organization/OrganizationEdit'

// Master Data
import MasterDataPortal from './pages/MasterDataPortal'

// Student Portal
import StudentPortal from './pages/students/StudentPortal'
import StudentDashboard from './pages/students/StudentDashboard'
import StudentList from './pages/students/StudentList'
import StudentDetail from './pages/students/StudentDetail'
import StudentForm from './pages/students/StudentForm'
import StudentEdit from './pages/students/StudentEdit'
import StudentReports from './pages/students/StudentReports'
import StudentFilters from './pages/students/StudentFilters'
import AdmissionForm from './pages/students/AdmissionForm'
import StudentInvoices from './pages/students/StudentInvoices'

// Fees Portal & sub‑pages
import FeesPortal from './pages/fees/FeesPortal'
import FeesDashboard from './pages/fees/FeesDashboard'
import FeesList from './pages/fees/FeesList'
import FeesDetail from './pages/fees/FeesDetail'
import FeesEdit from './pages/fees/FeesEdit'
import InvoicesList from './pages/fees/InvoicesList'
import InvoiceDetail from './pages/fees/InvoiceDetail'
import ReceiptsList from './pages/fees/ReceiptsList'
import FeesReports from './pages/fees/FeesReports'
import FeeCollection from './pages/fees/FeeCollection'

import AccountsPortal from './pages/accounts/AccountsPortal'
import AccountsDashboard from './pages/accounts/AccountsDashboard'
import Ledger from './pages/accounts/Ledger'
import JournalEntries from './pages/accounts/JournalEntries'
import JournalEntryDetail from './pages/accounts/JournalEntryDetail' 
import Income from './pages/accounts/Income'
import Expenses from './pages/accounts/Expenses'
import TrialBalance from './pages/accounts/TrialBalance'
import AccountLedger from './pages/accounts/AccountLedger'
import StudentLedger from './pages/accounts/StudentLedger'
import GSTPage from './pages/accounts/GSTPage'


// Academics Portal
import AcademicsPortal from './pages/academics/AcademicsPortal'
import BatchList from './pages/academics/Batches/BatchList'
import BatchForm from './pages/academics/Batches/BatchForm'
import BatchDetail from './pages/academics/Batches/BatchDetail'
import StudentBatchList from './pages/academics/StudentBatches/StudentBatchList'
import AssignStudent from './pages/academics/StudentBatches/AssignStudent'
import HomeworkList from './pages/academics/Homework/HomeworkList'
import HomeworkForm from './pages/academics/Homework/HomeworkForm'
import HomeworkDetail from './pages/academics/Homework/HomeworkDetail'
import ExamList from './pages/academics/Exams/ExamList'
import ExamForm from './pages/academics/Exams/ExamForm'
import ExamResults from './pages/academics/Exams/ExamResults'
import ExamDetail from './pages/academics/Exams/ExamDetail'
import ResultsDashboard from './pages/academics/Results/ResultsDashboard'
import StudentReportCard from './pages/academics/Results/StudentReportCard' 
import BatchResults from './pages/academics/Results/BatchResults'
import CertificateList from './pages/academics/Certificates/CertificateList'
import GenerateCertificate from './pages/academics/Certificates/GenerateCertificate'
import CertificateDetail from './pages/academics/Certificates/CertificateDetail'
import AttendanceList from './pages/academics/Attendance/AttendanceList'
import TakeAttendance from './pages/academics/Attendance/TakeAttendance'
import AttendanceDetail from './pages/academics/Attendance/AttendanceDetail'
import AttendanceForm from './pages/academics/Attendance/AttendanceForm'
import AttendanceReport from './pages/academics/Attendance/AttendanceReport'
import ExamResultsReport from './pages/academics/Results/ExamResultsReport'
import BatchStudentListReport from './pages/academics/Batches/BatchStudentListReport'
import ProfitLoss from './pages/accounts/ProfitLoss'
import BalanceSheet from './pages/accounts/BalanceSheet'
import GSTLedger from './pages/accounts/GSTLedger'


// Invoices
import InvoiceView from './pages/invoices/InvoiceView'

// Receipt View (standalone)
import ReceiptView from './pages/fees/ReceiptView'

// Courses (existing)
import CourseList from './pages/courses/CourseList'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="organization" element={<OrganizationEdit />} />
      <Route path="courses" element={<CourseList />} />
      <Route path="master-data" element={<MasterDataPortal />} />

      {/* Student Portal */}
      <Route path="students" element={<StudentPortal />}>
        <Route index element={<StudentDashboard />} />
        <Route path="list" element={<StudentList />} />
        <Route path="reports" element={<StudentReports />} />
        <Route path="new" element={<StudentForm />} />
        <Route path=":id/edit" element={<StudentEdit />} />
        <Route path=":id" element={<StudentDetail />} />
        <Route path="filters" element={<StudentFilters />} />
      </Route>

      {/* Admission Form – direct child of MainLayout */}
      <Route path="students/:id/admission-form" element={<AdmissionForm />} />

      {/* Student Invoices – direct child of MainLayout */}
      <Route path="students/:id/invoices" element={<StudentInvoices />} />

      {/* Invoice Detail – direct child of MainLayout */}
      <Route path="invoices/:id" element={<InvoiceView />} />
      <Route path="fees/invoices/:invoiceId" element={<InvoiceDetail />} />

      {/* Receipt View – direct child of MainLayout */}
      <Route path="receipts/:id" element={<ReceiptView />} />

      {/* Fee Collection – direct child of MainLayout */}
      <Route path="fees/collect" element={<FeeCollection />} />

      {/* Inquiry Portal */}
      <Route path="inquiries" element={<InquiryPortal />}>
        <Route index element={<InquiryDashboard />} />
        <Route path="list" element={<InquiryList />} />
        <Route path="demos" element={<DemoList />} />
        <Route path="demos/:id" element={<DemoDetail />} />
        <Route path="reports" element={<ReportsList />} />
        <Route path="reports/:reportKey" element={<ReportPage />} />
        <Route path="new" element={<InquiryForm />} />
        <Route path=":id" element={<InquiryDetail />} />
        <Route path=":id/edit" element={<InquiryEdit />} />
        <Route path=":id/journey" element={<InquiryJourney />} />
      </Route>

      {/* Fees Portal */}
      <Route path="fees" element={<FeesPortal />}>
        <Route index element={<FeesDashboard />} />
        <Route path="list" element={<FeesList />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="receipts" element={<ReceiptsList />} />
        <Route path="reports" element={<FeesReports />} />
        <Route path="new" element={<FeeCollection />} />   
        <Route path=":id" element={<FeesDetail />} />
        <Route path=":id/edit" element={<FeesEdit />} />
        {/* ❌ Remove ReceiptView from here – it's now at top level */}
      </Route>

      <Route path="accounts" element={<AccountsPortal />}>
        <Route index element={<AccountsDashboard />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="account-ledger/:accountId" element={<AccountLedger />} />   {/* new */}
        <Route path="student-ledger" element={<StudentLedger />} />             {/* new */}
        <Route path="journal" element={<JournalEntries />} />
        <Route path="journal/:id" element={<JournalEntryDetail />} /> {/* optional */}
        <Route path="income" element={<Income />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="trial-balance" element={<TrialBalance />} />
        <Route path="gst" element={<GSTPage />} />                             {/* new */}
        <Route path="profit-loss" element={<ProfitLoss />} />      {/* ✅ add */}
        <Route path="balance-sheet" element={<BalanceSheet />} />  {/* ✅ add */}
        <Route path="gst-ledger" element={<GSTLedger />} />
      </Route>

       // Inside MainLayout routes:
      <Route path="academics" element={<AcademicsPortal />}>
        <Route index element={<BatchList />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/new" element={<BatchForm />} />
        <Route path="batches/:id" element={<BatchDetail />} />
        <Route path="batches/:id/edit" element={<BatchForm />} />
        <Route path="student-batches" element={<StudentBatchList />} />
        <Route path="assign-student" element={<AssignStudent />} />
        <Route path="homework" element={<HomeworkList />} />
        <Route path="homework/new" element={<HomeworkForm />} />
        <Route path="homework/:id" element={<HomeworkDetail />} />
        <Route path="homework/:id/edit" element={<HomeworkForm />} />
        <Route path="exams" element={<ExamList />} />
        <Route path="exams/new" element={<ExamForm />} />
        <Route path="exams/:id" element={<ExamResults />} />   // shows results/mark entry
        <Route path="exams/:id/edit" element={<ExamForm />} />
        <Route path="exams/:id" element={<ExamDetail />} />
        <Route path="results" element={<ResultsDashboard />} />
        <Route path="results/student/:studentId" element={<StudentReportCard />} />
        <Route path="results/batch/:batchId" element={<BatchResults />} />
        <Route path="certificates" element={<CertificateList />} />
        <Route path="certificates/generate" element={<GenerateCertificate />} />
        <Route path="certificates/:id" element={<CertificateDetail />} />
        <Route path="attendance" element={<AttendanceList />} />
        <Route path="attendance/take" element={<TakeAttendance />} />
        <Route path="attendance/:id" element={<AttendanceDetail />} /> {/* optional */}
        <Route path="attendance/:id/edit" element={<TakeAttendance />} /> {/* reuse */}
        <Route path="attendance/new" element={<AttendanceForm />} />
        <Route path="attendance-report" element={<AttendanceReport />} />.
        <Route path="exam-results-report" element={<ExamResultsReport />} />
        <Route path="batch-student-list" element={<BatchStudentListReport />} />

        {/* Add other sub-paths later */}
      </Route>
      
    </Route>
      
     

    {/* Catch‑all route for 404 */}
    <Route path="/404" element={<div className="p-4">Page Not Found</div>} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>
)

export default App