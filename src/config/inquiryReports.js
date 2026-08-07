// src/config/inquiryReports.js
import {
  FunnelPlotOutlined,
  GlobalOutlined,
  BookOutlined,
  LineChartOutlined,
  VideoCameraOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  AlertOutlined,
  BankOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

export const inquiryReports = [
  // ---------- 1. Funnel ----------
  {
    key: 'funnel',
    title: 'Inquiry Funnel',
    description: 'Status breakdown by month',
    icon: FunnelPlotOutlined,
    color: '#1677ff',
    viewName: 'report_inquiry_funnel',
    defaultSort: { field: 'month', order: 'desc' },
    dateField: 'month',
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Month', dataIndex: 'month', width: 140, render: (val) => val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-' },
      { title: 'Total', dataIndex: 'total_inquiries', width: 100 },
      { title: 'Contacted', dataIndex: 'contacted', width: 100 },
      { title: 'Demo Scheduled', dataIndex: 'demo_scheduled', width: 120 },
      { title: 'Demo Conducted', dataIndex: 'demo_conducted', width: 120 },
      { title: 'Converted', dataIndex: 'converted', width: 100 },
      { title: 'Lost/Rejected', dataIndex: 'lost_rejected', width: 120 },
      { title: 'Conversion Rate', dataIndex: 'conversion_rate', width: 120, render: (val) => `${val}%` },
    ],
  },

  // ---------- 2. Source ----------
  {
    key: 'source',
    title: 'Source-wise Leads',
    description: 'Lead count & conversion by source',
    icon: GlobalOutlined,
    color: '#52c41a',
    viewName: 'report_inquiry_by_source',
    dateField: null,
    branchField: null,
    tableWidth: 0.98,
    columns: [
      { title: 'Source', dataIndex: 'source_name', width: 300 },
      { title: 'Total Inquiries', dataIndex: 'total_inquiries', width: 180 },
      { title: 'Converted', dataIndex: 'converted', width: 180 },
      { title: 'Conversion Rate', dataIndex: 'conversion_rate', width: 180, render: (v) => `${v}%` },
    ],
  },

  // ---------- 3. Course ----------
  {
    key: 'course',
    title: 'Course-wise Demand',
    description: 'Inquiries per course',
    icon: BookOutlined,
    color: '#722ed1',
    viewName: 'report_inquiry_by_course',
    dateField: null,
    branchField: null,
    tableWidth: 0.98,
    columns: [
      { title: 'Course', dataIndex: 'course_name', width: 250 },
      { title: 'Total', dataIndex: 'total_inquiries', width: 150 },
      { title: 'Converted', dataIndex: 'converted', width: 150 },
      { title: 'Demo Scheduled', dataIndex: 'demo_scheduled', width: 160 },
      { title: 'Demo Conducted', dataIndex: 'demo_conducted', width: 160 },
    ],
  },

  // ---------- 4. Conversion ----------
  {
    key: 'conversion',
    title: 'Conversion Analysis',
    description: 'Monthly conversion rate & days to convert',
    icon: LineChartOutlined,
    color: '#fa8c16',
    viewName: 'report_conversion_analysis',
    defaultSort: { field: 'month', order: 'desc' },
    dateField: 'month',
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Month', dataIndex: 'month', width: 150, render: (val) => val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-' },
      { title: 'Total', dataIndex: 'total_inquiries', width: 120 },
      { title: 'Converted', dataIndex: 'converted', width: 120 },
      { title: 'Conversion Rate', dataIndex: 'conversion_rate', width: 120, render: (v) => `${v}%` },
      { title: 'Avg Days to Convert', dataIndex: 'avg_days_to_convert', width: 180 },
    ],
  },

  // ---------- 5. Demo Performance ----------
  {
    key: 'demo-performance',
    title: 'Demo Performance',
    description: 'Teacher demo outcomes',
    icon: VideoCameraOutlined,
    color: '#eb2f96',
    viewName: 'report_demo_performance',
    dateField: null,
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Teacher', dataIndex: 'teacher_name', width: 200 },
      { title: 'Total Demos', dataIndex: 'total_demos', width: 120 },
      { title: 'Conducted', dataIndex: 'conducted', width: 120 },
      { title: 'Successful', dataIndex: 'successful', width: 120 },
      { title: 'Failed', dataIndex: 'failed', width: 120 },
      { title: 'Converted Inquiries', dataIndex: 'converted_inquiries', width: 160 },
    ],
  },

  // ---------- 6. Lost / Rejected ----------
  {
    key: 'lost-reasons',
    title: 'Lost / Rejected',
    description: 'Reasons & counts',
    icon: CloseCircleOutlined,
    color: '#ff4d4f',
    viewName: 'report_lost_reasons',
    defaultSort: { field: 'month', order: 'desc' },
    dateField: 'month',
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Month', dataIndex: 'month', width: 140, render: (val) => val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-' },
      { title: 'Status', dataIndex: 'status', width: 160 },
      { title: 'Count', dataIndex: 'count', width: 100 },
      { title: 'Reason', dataIndex: 'rejection_reason', width: 340 },
    ],
  },

  // ---------- 7. Daily Trend ----------
  {
    key: 'daily-trend',
    title: 'Daily Trend',
    description: 'New inquiries per day',
    icon: CalendarOutlined,
    color: '#13c2c2',
    viewName: 'report_daily_inquiries',
    defaultSort: { field: 'inquiry_date', order: 'desc' },
    dateField: 'inquiry_date',
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Date', dataIndex: 'inquiry_date', width: 300, render: (v) => new Date(v).toLocaleDateString() },
      { title: 'New Inquiries', dataIndex: 'new_inquiries', width: 300 },
    ],
  },

  // ---------- 8. Follow-up Alerts ----------
  {
    key: 'followup-alerts',
    title: 'Follow-up Alerts',
    description: 'Overdue or due today',
    icon: AlertOutlined,
    color: '#fadb14',
    viewName: 'report_followup_alerts',
    dateField: null,
    branchField: 'branch_id',
    tableWidth: 0.98,
    columns: [
      { title: 'Branch', dataIndex: 'branch_name', width: 160 },
      { title: 'Inquiry No', dataIndex: 'inquiry_no', width: 140 },
      { title: 'Student', dataIndex: 'student_name', width: 200 },
      { title: 'Mobile', dataIndex: 'mobile', width: 140 },
      { title: 'Follow-up Date', dataIndex: 'followup_date', width: 160, render: (v) => new Date(v).toLocaleDateString() },
      { title: 'Status', dataIndex: 'status', width: 140 },
    ],
  },

  // ---------- 9. Branch Comparison ----------
  {
    key: 'branch-comparison',
    title: 'Branch Comparison',
    description: 'Performance by branch',
    icon: BankOutlined,
    color: '#2f54eb',
    viewName: 'report_branch_comparison',
    dateField: null,
    branchField: null,
    tableWidth: 0.98,
    columns: [
      { title: 'Branch', dataIndex: 'branch_name', width: 300 },
      { title: 'Total Inquiries', dataIndex: 'total_inquiries', width: 200 },
      { title: 'Converted', dataIndex: 'converted', width: 200 },
      { title: 'Conversion Rate', dataIndex: 'conversion_rate', width: 200, render: (v) => `${v}%` },
    ],
  },

  // ---------- 10. Inquiry List ----------
  {
    key: 'inquiry-list',
    title: 'Inquiry List',
    description: 'Detailed list of all inquiries',
    icon: UnorderedListOutlined,
    color: '#1677ff',
    viewName: 'report_inquiry_list',
    defaultSort: { field: 'inquiry_date', order: 'desc' },
    dateField: 'inquiry_date',
    branchField: 'branch_id',
    statusField: 'status',
    tableWidth: 0.98,
    columns: [
      { title: 'Inquiry No',   dataIndex: 'inquiry_no',         width: 110 },
      { title: 'Student Name', dataIndex: 'student_full_name',  width: 180 },   // Note: this view uses student_full_name, so left as is
      { title: 'Mobile',       dataIndex: 'mobile',             width: 120 },
      { title: 'Email',        dataIndex: 'email',              width: 160 },
      { title: 'Source',       dataIndex: 'source_name',        width: 130 },
      { title: 'Date',         dataIndex: 'inquiry_date',       width: 110, render: (v) => (v ? dayjs(v).format('DD-MM-YY') : '-') },
      { title: 'Status',       dataIndex: 'status',             width: 130 },
    ],
  },

  // ---------- 11. Scheduled Demos ----------
  {
    key: 'demo-scheduled',
    title: 'Scheduled Demos',
    description: 'Demos that are currently scheduled',
    icon: VideoCameraOutlined,
    color: '#faad14',
    viewName: 'demo_sessions_view',
    defaultSort: { field: 'scheduled_date', order: 'desc' },
    dateField: 'scheduled_date',
    branchField: 'branch_id',
    statusField: 'status',
    fixedStatus: 'Scheduled',
    tableWidth: 0.98,
    columns: [
      { title: 'Branch',           dataIndex: 'branch_name',         width: 100 },
      { title: 'Inquiry No',       dataIndex: 'inquiry_no',          width: 100 },
      { title: 'Student Name',     dataIndex: 'student_name',        width: 160 },   // ✅ fixed
      { title: 'Mobile',           dataIndex: 'mobile_no',           width: 110 },
      { title: 'Course',           dataIndex: 'course_name',         width: 120 },
      { title: 'Teacher',          dataIndex: 'teacher_name',        width: 130 },
      { title: 'Scheduled Date',   dataIndex: 'scheduled_date',      width: 120, render: (v) => (v ? dayjs(v).format('DD-MM-YY') : '-') },
      { title: 'Scheduled Time',   dataIndex: 'scheduled_time',      width: 100, render: (v) => (v ? v.slice(0, 5) : '-') },
      { title: 'Duration (min)',   dataIndex: 'duration',            width: 100 },
    ],
  },

  // ---------- 12. Conducted Demos ----------
  {
    key: 'demo-conducted',
    title: 'Conducted Demos',
    description: 'Demos that have been conducted',
    icon: VideoCameraOutlined,
    color: '#722ed1',
    viewName: 'demo_sessions_view',
    defaultSort: { field: 'conducted_date', order: 'desc' },
    dateField: 'conducted_date',
    branchField: 'branch_id',
    statusField: 'status',
    fixedStatus: 'Conducted',
    tableWidth: 0.98,
    columns: [
      { title: 'Branch',           dataIndex: 'branch_name',         width: 90 },
      { title: 'Inquiry No',       dataIndex: 'inquiry_no',          width: 90 },
      { title: 'Student Name',     dataIndex: 'student_name',        width: 150 },   // ✅ fixed
      { title: 'Mobile',           dataIndex: 'mobile_no',           width: 100 },
      { title: 'Course',           dataIndex: 'course_name',         width: 110 },
      { title: 'Teacher',          dataIndex: 'teacher_name',        width: 120 },
      { title: 'Conducted Date',   dataIndex: 'conducted_date',      width: 110, render: (v) => (v ? dayjs(v).format('DD-MM-YY') : '-') },
      { title: 'Conducted Time',   dataIndex: 'conducted_time',      width: 90, render: (v) => (v ? v.slice(0, 5) : '-') },
      { title: 'Duration (min)',   dataIndex: 'duration',            width: 90 },
      { title: 'Outcome',          dataIndex: 'outcome',             width: 100 },
      { title: 'Attended By',      dataIndex: 'demo_attended_by',    width: 100 },
    ],
  },

  // ---------- 13. Demo Outcomes ----------
  {
    key: 'demo-outcomes',
    title: 'Demo Outcomes',
    description: 'Outcome and feedback of conducted demos',
    icon: VideoCameraOutlined,
    color: '#eb2f96',
    viewName: 'demo_sessions_view',
    defaultSort: { field: 'conducted_date', order: 'desc' },
    dateField: 'conducted_date',
    branchField: 'branch_id',
    statusField: 'status',
    fixedStatus: 'Conducted',
    tableWidth: 0.98,
    columns: [
      { title: 'Branch',           dataIndex: 'branch_name',         width: 90 },
      { title: 'Inquiry No',       dataIndex: 'inquiry_no',          width: 90 },
      { title: 'Student Name',     dataIndex: 'student_name',        width: 150 },   // ✅ fixed
      { title: 'Course',           dataIndex: 'course_name',         width: 110 },
      { title: 'Teacher',          dataIndex: 'teacher_name',        width: 120 },
      { title: 'Outcome',          dataIndex: 'outcome',             width: 100 },
      { title: 'Feedback',         dataIndex: 'feedback',            width: 160 },
      { title: 'Teacher Remarks',  dataIndex: 'teacher_remarks',     width: 160 },
      { title: 'Conducted Date',   dataIndex: 'conducted_date',      width: 110, render: (v) => (v ? dayjs(v).format('DD-MM-YY') : '-') },
    ],
  },
]