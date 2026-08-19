// src/App.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ScopeProvider } from './contexts/ScopeContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import Login from './pages/auth/Login'

// Student Portal (student role)
import StudentPortalDashboard from './pages/studentportal/StudentDashboard'
import StudentPortalAttendance from './pages/studentportal/StudentAttendance'
import StudentPortalProfile from './pages/studentportal/StudentProfile'
import StudentPortalResults from './pages/studentportal/StudentResults'

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
import InquiryReportsList from './pages/inquiries/InquiryReportsList'

// Reports
import ReportsList from './pages/reports/ReportsList'
import ReportPage from './pages/reports/ReportPage'
import AllReportsList from './pages/reports/AllReportsList'

// Organization settings
import OrganizationEdit from './pages/organization/OrganizationEdit'

// Master Data
import MasterDataPortal from './pages/MasterDataPortal'

// Student Admin Portal
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

// Fees
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
import StudentFeeBalance from './pages/fees/StudentFeeBalance'

// Accounts
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
import ProfitLoss from './pages/accounts/ProfitLoss'
import BalanceSheet from './pages/accounts/BalanceSheet'
import GSTLedger from './pages/accounts/GSTLedger'
import GeneralStudentLedger from './pages/accounts/GeneralStudentLedger'
import OpeningBalances from './pages/accounts/OpeningBalances'
import VendorPayments from './pages/accounts/VendorPayments'
import DailyReport from './pages/accounts/DailyReport'

// Academics
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

// HR
import HRPortal from './pages/hr/HRPortal'
import HRDashboard from './pages/hr/HRDashboard'
import EmployeeList from './pages/hr/EmployeeList'
import EmployeeForm from './pages/hr/EmployeeForm'
import EmployeeDetail from './pages/hr/EmployeeDetail'
import Attendance from './pages/hr/Attendance'
import HRAttendanceReport from './pages/hr/AttendanceReport'
import Leaves from './pages/hr/Leaves'
import SalaryCalculation from './pages/hr/SalaryCalculation'
import Salary from './pages/hr/Salary'
import LeaveReport from './pages/hr/LeaveReport'

// Invoices & Receipts
import InvoiceView from './pages/invoices/InvoiceView'
import ReceiptView from './pages/fees/ReceiptView'

// Inventory
import InventoryPortal from './pages/inventory/InventoryPortal'
import InventoryDashboard from './pages/inventory/InventoryDashboard'
import InventoryItems from './pages/inventory/InventoryItems'
import PurchaseOrderList from './pages/inventory/PurchaseOrderList'
import PurchaseOrderForm from './pages/inventory/PurchaseOrderForm'
import PurchaseOrderDetail from './pages/inventory/PurchaseOrderDetail'
import PurchaseInvoiceList from './pages/inventory/PurchaseInvoiceList'
import PurchaseInvoiceForm from './pages/inventory/PurchaseInvoiceForm'
import PurchaseInvoiceDetail from './pages/inventory/PurchaseInvoiceDetail'
import StockManagement from './pages/inventory/StockManagement'
import InventoryTransactions from './pages/inventory/InventoryTransactions'
import VendorList from './pages/inventory/VendorList'
import VendorForm from './pages/inventory/VendorForm'
import VendorPaymentDetail from './pages/accounts/VendorPaymentDetail'
import IssueForm from './pages/inventory/IssueForm'
import TransferForm from './pages/inventory/TransferForm'

// Teacher
import TeacherAttendance from './pages/teacher/TeacherAttendance'
import TeacherBatches from './pages/teacher/TeacherBatches'
import TeacherHomework from './pages/teacher/TeacherHomework'
import TeacherExams from './pages/teacher/TeacherExams'
import TeacherLeaves from './pages/teacher/TeacherLeaves'
import TeacherSalary from './pages/teacher/TeacherSalary'
import TeacherProfile from './pages/teacher/TeacherProfile'
import TeacherTimetable from './pages/teacher/TeacherTimetable'

import StudentPortalHomework from './pages/studentportal/StudentHomework'
import StudentPortalFees from './pages/studentportal/StudentFees'
import StudentPortalTimetable from './pages/studentportal/StudentTimetable'
import StudentHomeworkDetail from './pages/studentportal/StudentHomeworkDetail'
import StudentCertificates from './pages/studentportal/StudentCertificates'

// Courses
import CourseList from './pages/courses/CourseList'

import NotificationPage from './pages/notifications/NotificationPage'

const TeacherRoute = () => {
  const { profile } = useAuth()
  if (profile?.role !== 'Teacher') return <Navigate to="/" replace />
  return <Outlet />
}

const StudentRoute = () => {
  const { profile } = useAuth()
  if (profile?.role !== 'Student') return <Navigate to="/" replace />
  return <Outlet />
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

const App = () => {
  const { profile, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  const isTeacher = profile?.role === 'Teacher';
  const isStudent = profile?.role === 'Student';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <OrganizationProvider>
              <ScopeProvider>
                <MainLayout />
              </ScopeProvider>
            </OrganizationProvider>
          </ProtectedRoute>
        }
      >
        {/* Root dashboard based on role */}
        <Route index element={isTeacher ? <TeacherDashboard /> : isStudent ? <StudentPortalDashboard /> : <Dashboard />} />
        <Route path="notifications" element={<NotificationPage />} />

        {/* ========== STUDENT ROUTES ========== */}
        <Route element={<StudentRoute />}>
          <Route path="student">
            <Route index element={<StudentPortalDashboard />} />
            <Route path="attendance" element={<StudentPortalAttendance />} />
            <Route path="results" element={<StudentPortalResults />} />
            <Route path="profile" element={<StudentPortalProfile />} />
            <Route path="homework" element={<StudentPortalHomework />} />
<Route path="fees" element={<StudentPortalFees />} />
<Route path="timetable" element={<StudentPortalTimetable />} />
<Route path="homework/:homeworkId" element={<StudentHomeworkDetail />} />
<Route path="certificates" element={<StudentCertificates />} />
          </Route>
        </Route>

        {/* ========== TEACHER ROUTES ========== */}
        <Route element={<TeacherRoute />}>
          <Route path="teacher">
            <Route index element={<TeacherDashboard />} />
            <Route path="attendance" element={<TeacherAttendance />} />
            <Route path="attendance/take" element={<TakeAttendance />} /> 
            <Route path="batches" element={<TeacherBatches />} />
            <Route path="homework" element={<TeacherHomework />} />
            <Route path="exams" element={<TeacherExams />} />
            <Route path="leaves" element={<TeacherLeaves />} />
            <Route path="salary" element={<TeacherSalary />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="timetable" element={<TeacherTimetable />} />
          </Route>
        </Route>

        {/* ========== ADMIN ROUTES ========== */}
        {/* Organization & Master Data */}
        <Route path="organization" element={<OrganizationEdit />} />
        <Route path="master-data" element={<MasterDataPortal />} />
        <Route path="courses" element={<CourseList />} />

        {/* INQUIRIES */}
        <Route path="inquiries" element={<InquiryPortal />}>
          <Route index element={<InquiryDashboard />} />
          <Route path="list" element={<InquiryList />} />
          <Route path="demos" element={<DemoList />} />
          <Route path="demos/:id" element={<DemoDetail />} />
          <Route path="new" element={<InquiryForm />} />
          <Route path="reports" element={<InquiryReportsList />} />
          <Route path=":id" element={<InquiryDetail />} />
          <Route path=":id/edit" element={<InquiryEdit />} />
          <Route path=":id/journey" element={<InquiryJourney />} />
        </Route>

        {/* REPORTS */}
        <Route path="reports">
          <Route index element={<AllReportsList />} />
          <Route path=":reportKey" element={<ReportPage />} />
        </Route>

        {/* STUDENTS (Admin) */}
        <Route path="students" element={<StudentPortal />}>
          <Route index element={<StudentDashboard />} />
          <Route path="list" element={<StudentList />} />
          <Route path="reports" element={<StudentReports />} />
          <Route path="new" element={<StudentForm />} />
          <Route path=":id/edit" element={<StudentEdit />} />
          <Route path=":id" element={<StudentDetail />} />
          <Route path="filters" element={<StudentFilters />} />
        </Route>
        <Route path="students/:id/admission-form" element={<AdmissionForm />} />
        <Route path="students/:id/invoices" element={<StudentInvoices />} />

        {/* FEES */}
        <Route path="fees" element={<FeesPortal />}>
          <Route index element={<FeesDashboard />} />
          <Route path="list" element={<FeesList />} />
          <Route path="balances" element={<StudentFeeBalance />} />
          <Route path="invoices" element={<InvoicesList />} />
          <Route path="receipts" element={<ReceiptsList />} />
          <Route path="reports" element={<FeesReports />} />
          <Route path="new" element={<FeeCollection />} />
          <Route path=":id" element={<FeesDetail />} />
          <Route path=":id/edit" element={<FeesEdit />} />
        </Route>
        <Route path="fees/collect" element={<FeeCollection />} />
        <Route path="fees/invoices/:invoiceId" element={<InvoiceDetail />} />
        <Route path="receipts/:id" element={<ReceiptView />} />
        <Route path="invoices/:id" element={<InvoiceView />} />

        {/* ACCOUNTS */}
        <Route path="accounts" element={<AccountsPortal />}>
          <Route index element={<AccountsDashboard />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="account-ledger/:accountId" element={<AccountLedger />} />
          <Route path="student-ledger" element={<StudentLedger />} />
          <Route path="general-student-ledger" element={<GeneralStudentLedger />} />
          <Route path="journal" element={<JournalEntries />} />
          <Route path="journal/:id" element={<JournalEntryDetail />} />
          <Route path="income" element={<Income />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="trial-balance" element={<TrialBalance />} />
          <Route path="gst" element={<GSTPage />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="balance-sheet" element={<BalanceSheet />} />
          <Route path="gst-ledger" element={<GSTLedger />} />
          <Route path="opening-balances" element={<OpeningBalances />} />
          <Route path="vendor-payments" element={<VendorPayments />} />
          <Route path="vendor-payments/:id" element={<VendorPaymentDetail />} />
          <Route path="daily-report" element={<DailyReport />} />
        </Route>

        {/* ACADEMICS */}
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
          <Route path="exams/:id" element={<ExamResults />} />
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
          <Route path="attendance/:id" element={<AttendanceDetail />} />
          <Route path="attendance/:id/edit" element={<TakeAttendance />} />
          <Route path="attendance/new" element={<AttendanceForm />} />
          <Route path="attendance-report" element={<AttendanceReport />} />
          <Route path="exam-results-report" element={<ExamResultsReport />} />
          <Route path="batch-student-list" element={<BatchStudentListReport />} />
        </Route>

        {/* HR */}
        <Route path="hr" element={<HRPortal />}>
          <Route index element={<HRDashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance-report" element={<HRAttendanceReport />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="salary" element={<Salary />} />
          <Route path="salary-calculation" element={<SalaryCalculation />} />
          <Route path="leave-report" element={<LeaveReport />} />
        </Route>

        {/* INVENTORY */}
        <Route path="inventory" element={<InventoryPortal />}>
          <Route index element={<InventoryDashboard />} />
          <Route path="items" element={<InventoryItems />} />
          <Route path="purchase-orders" element={<PurchaseOrderList />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="purchase-invoices" element={<PurchaseInvoiceList />} />
          <Route path="purchase-invoices/new" element={<PurchaseInvoiceForm />} />
          <Route path="purchase-invoices/:id" element={<PurchaseInvoiceDetail />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="transactions" element={<InventoryTransactions />} />
          <Route path="vendor-payments" element={<VendorPayments />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/new" element={<VendorForm />} />
          <Route path="vendors/:id/edit" element={<VendorForm />} />
          <Route path="vendor-payments/:id" element={<VendorPaymentDetail />} />
          <Route path="issue" element={<IssueForm />} />
          <Route path="transfer" element={<TransferForm />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="/404" element={<div className="p-4">Page Not Found</div>} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App