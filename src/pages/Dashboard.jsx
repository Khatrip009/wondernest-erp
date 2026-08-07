// src/pages/Dashboard.jsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TeamOutlined,
  BookOutlined,
  SolutionOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  AlertOutlined,
  UserAddOutlined,
  PhoneOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useOrganization } from "../contexts/OrganizationContext";
import { supabase } from "../lib/supabase";

// ---------- StatCard ----------
const StatCard = ({ icon: Icon, title, value, subtext, color, linkTo, onClick }) => {
  const { theme, darkMode } = useTheme();
  const primaryColor = theme?.primary_color || "#0D47A1";
  const accentColor = theme?.accent_color || "#FF1070";
  const fontBody = theme?.font_body || "Montserrat";

  const bgColor =
    color === 'bg-primary' ? primaryColor :
    color === 'bg-accent' ? accentColor :
    color === 'bg-primary-dark' ? (darkMode ? '#1a237e' : '#0a3478') :
    color === 'bg-accent-dark' ? (darkMode ? '#880e4f' : '#c51162') :
    color === 'bg-primary-light' ? (darkMode ? '#1565c0' : '#1565c0') :
    (darkMode ? '#2c2c2c' : '#f5f5f5');

  const cardBg = darkMode ? '#1f1f1f' : '#ffffff';
  const borderColor = darkMode ? '#444' : '#e0e0e0';
  const textColor = darkMode ? '#d9d9d9' : '#333';

  const content = (
    <div className="rounded-xl p-5 shadow-sm border transition-all cursor-pointer" style={{ backgroundColor: cardBg, borderColor, fontFamily: fontBody }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: darkMode ? '#aaa' : '#666' }}>{title}</p>
          <h3 className="text-2xl font-bold mt-1" style={{ color: primaryColor }}>{value}</h3>
          {subtext && <p className="text-xs mt-1" style={{ color: darkMode ? '#888' : '#999' }}>{subtext}</p>}
        </div>
        <div className="p-3 rounded-xl text-white" style={{ backgroundColor: bgColor }}>
          <Icon style={{ fontSize: 22 }} />
        </div>
      </div>
    </div>
  );
  if (linkTo) return <Link to={linkTo}>{content}</Link>;
  return <div onClick={onClick}>{content}</div>;
};

// ---------- QuickAction ----------
const QuickAction = ({ icon: Icon, label, onClick }) => {
  const { theme, darkMode } = useTheme();
  const primaryColor = theme?.primary_color || "#0D47A1";
  const fontBody = theme?.font_body || "Montserrat";
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff';
  const borderColor = darkMode ? '#444' : '#e0e0e0';
  const textColor = darkMode ? '#d9d9d9' : '#333';

  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl shadow-sm border transition-all w-full"
      style={{ backgroundColor: cardBg, borderColor, fontFamily: fontBody }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = primaryColor; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div className="p-3 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }}>
        <Icon style={{ fontSize: 20, color: primaryColor }} />
      </div>
      <span className="text-xs font-medium" style={{ color: textColor }}>{label}</span>
    </button>
  );
};

// ---------- RecentTable ----------
const RecentTable = ({ title, columns, data, emptyMessage }) => {
  const { theme, darkMode } = useTheme();
  const primaryColor = theme?.primary_color || "#0D47A1";
  const fontHeading = theme?.font_heading || "Righteous";
  const fontBody = theme?.font_body || "Montserrat";
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff';
  const borderColor = darkMode ? '#444' : '#e0e0e0';
  const textColor = darkMode ? '#d9d9d9' : '#333';
  const headerBg = darkMode ? '#2c2c2c' : '#f5f5f5';

  return (
    <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
      <h3 className="text-lg font-semibold p-4 border-b" style={{ color: primaryColor, fontFamily: fontHeading }}>{title}</h3>
      {data.length === 0 ? (
        <p className="p-4 text-sm" style={{ color: darkMode ? '#888' : '#999', fontFamily: fontBody }}>{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead style={{ backgroundColor: headerBg }}>
              <tr>
                {columns.map(col => (
                  <th key={col} className="text-left p-3 text-sm font-medium uppercase" style={{ color: darkMode ? '#aaa' : '#666', fontFamily: fontBody }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor }}>
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-primary-bg dark:hover:bg-gray-700 transition-colors">
                  {row.map((cell, i) => (
                    <td key={i} className="p-3 text-sm" style={{ color: textColor, fontFamily: fontBody }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------- Dashboard Component ----------
export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { theme, darkMode } = useTheme();
  const { org } = useOrganization();
  const orgId = org?.id;

  const primaryColor = theme?.primary_color || "#0D47A1";
  const accentColor = theme?.accent_color || "#FF1070";
  const fontHeading = theme?.font_heading || "Righteous";
  const fontBody = theme?.font_body || "Montserrat";

  const { data: rawStats, isLoading, isError } = useQuery({
    queryKey: ["dashboardStats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc("get_dashboard_stats", { p_org_id: orgId });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const s = rawStats || {};
  const feeStatusData = s.feeStatusData || { paid: 0, pending: 0 };

  const stats = {
    totalStudents: s.totalStudents ?? 0,
    activeBatches: s.activeBatches ?? 0,
    todayAttendance: s.todayAttendance ?? { present: 0, total: 0 },
    monthlyFeeCollection: s.monthlyFeeCollection ?? 0,
    pendingFees: s.pendingFees ?? 0,
    totalTeachers: s.totalTeachers ?? 0,
    activeCourses: s.activeCourses ?? 0,
    totalParents: s.totalParents ?? 0,
    newInquiriesThisMonth: s.newInquiriesThisMonth ?? 0,
    recentInquiries: s.recentInquiries || [],
    recentPayments: s.recentPayments || [],
    upcomingExams: s.upcomingExams || [],
    lowStockItems: s.lowStockItems || [],
    pendingInvoicesCount: s.pendingInvoicesCount ?? 0,
    pendingInvoicesAmount: s.pendingInvoicesAmount ?? 0,
    todayIncome: s.todayIncome ?? 0,
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-primary-dark/60 dark:text-gray-400" style={{ fontFamily: fontBody }}>Loading dashboard…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-accent-dark dark:text-red-400">
        Failed to load dashboard data. Please try again later.
      </div>
    );
  }

  const bgColor = darkMode ? '#141414' : '#f5f5f5';
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff';
  const borderColor = darkMode ? '#444' : '#e0e0e0';

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-0" style={{ backgroundColor: bgColor, fontFamily: fontBody }}>
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: primaryColor, fontFamily: fontHeading }}>
            Welcome, {profile?.full_name || "Admin"}!
          </h1>
          <p className="text-sm mt-1" style={{ color: darkMode ? '#aaa' : '#666' }}>
            Here's your academy at a glance.
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <QuickAction icon={PhoneOutlined} label="New Inquiry" onClick={() => navigate("/inquiries/new")} />
          <QuickAction icon={UserAddOutlined} label="Add Student" onClick={() => navigate("/students/new")} />
          <QuickAction icon={DollarOutlined} label="Record Payment" onClick={() => navigate("/fees/collect")} />
          <QuickAction icon={PlusCircleOutlined} label="New Exam" onClick={() => navigate("/academics/exams/new")} />
          <QuickAction icon={CalendarOutlined} label="New Session" onClick={() => navigate("/academics/attendance/take")} />
          <QuickAction icon={FileTextOutlined} label="New Homework" onClick={() => navigate("/academics/homework/new")} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={TeamOutlined} title="Total Students" value={stats.totalStudents} subtext="Active enrollments" color="bg-primary" />
        <StatCard icon={BookOutlined} title="Active Batches" value={stats.activeBatches} subtext="Currently running" color="bg-accent" />
        <StatCard icon={SolutionOutlined} title="Teachers" value={stats.totalTeachers} color="bg-primary-dark" />
        <StatCard icon={TeamOutlined} title="Parents" value={stats.totalParents} color="bg-accent-dark" />

        <StatCard
          icon={CalendarOutlined}
          title="Today's Attendance"
          value={stats.todayAttendance.total > 0 ? `${Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100)}%` : "N/A"}
          subtext={stats.todayAttendance.total > 0 ? `${stats.todayAttendance.present} / ${stats.todayAttendance.total} marked` : "No session today"}
          color="bg-primary-light"
        />
        <StatCard icon={DollarOutlined} title="Monthly Collection" value={`₹${stats.monthlyFeeCollection.toLocaleString()}`} subtext="This month" color="bg-accent" />
        <StatCard icon={AlertOutlined} title="Pending Fees" value={`₹${stats.pendingFees.toLocaleString()}`} subtext="All time" color="bg-accent-dark" />
        <StatCard icon={LineChartOutlined} title="Active Courses" value={stats.activeCourses} color="bg-primary" />

        <StatCard icon={ClockCircleOutlined} title="Upcoming Exams" value={stats.upcomingExams.length} subtext="Next few days" color="bg-primary-dark" />
        <StatCard icon={PhoneOutlined} title="New Inquiries (Month)" value={stats.newInquiriesThisMonth} subtext="This month" color="bg-accent" />

        <StatCard icon={AppstoreOutlined} title="Low Stock Items" value={stats.lowStockItems.length} subtext={stats.lowStockItems.length > 0 ? "Need reorder" : "All stocked"} color="bg-primary" />
        <StatCard icon={FileTextOutlined} title="Pending Invoices" value={`₹${stats.pendingInvoicesAmount.toLocaleString()}`} subtext={`${stats.pendingInvoicesCount} invoice${stats.pendingInvoicesCount !== 1 ? 's' : ''} pending`} color="bg-accent-dark" />
        <StatCard icon={CheckCircleOutlined} title="Today's Income" value={`₹${stats.todayIncome.toLocaleString()}`} subtext="Collected today" color="bg-accent" />
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems.length > 0 && (
        <div className="p-4 border rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(255,16,112,0.1)' : '#fff0f0', borderColor: accentColor }}>
          <div className="flex items-center gap-2" style={{ color: accentColor }}>
            <ExclamationCircleOutlined style={{ fontSize: 18 }} />
            <h3 className="font-semibold" style={{ fontFamily: fontHeading }}>Low Stock Alert</h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.lowStockItems.map((item) => (
              <span key={item.id} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: darkMode ? 'rgba(255,16,112,0.2)' : '#ffebee', color: accentColor }}>
                {item.item_name}: {item.current_stock} (Min: {item.reorder_level})
              </span>
            ))}
          </div>
          <button onClick={() => navigate("/master-data/inventory")} className="mt-2 text-sm underline" style={{ color: accentColor }}>
            View all inventory
          </button>
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTable
          title="Recent Inquiries"
          columns={["Inquiry No", "Student", "Mobile", "Status"]}
          data={stats.recentInquiries.map((inq) => [
            inq.inquiry_no,
            inq.student_name,
            inq.mobile,
            <span key={inq.inquiry_no} className={`px-2 py-1 rounded-full text-xs font-medium ${inq.status === "New" ? "bg-primary-bg text-primary-dark dark:bg-primary/20 dark:text-primary-light" : "bg-accent-bg text-accent-dark dark:bg-accent/20 dark:text-accent-light"}`}>{inq.status}</span>,
          ])}
          emptyMessage="No recent inquiries"
        />
        <RecentTable
          title="Recent Payments"
          columns={["Date", "Student", "Amount", "Mode"]}
          data={stats.recentPayments.map((pay) => [
            pay.payment_date,
            pay.student_name,
            `₹${Number(pay.amount).toLocaleString()}`,
            pay.payment_mode,
          ])}
          emptyMessage="No recent payments"
        />
        <RecentTable
          title="Upcoming Exams"
          columns={["Exam", "Batch", "Date"]}
          data={stats.upcomingExams.map((exam) => [
            exam.exam_name,
            exam.batch_name,
            exam.exam_date,
          ])}
          emptyMessage="No upcoming exams"
        />
      </div>
    </div>
  );
}