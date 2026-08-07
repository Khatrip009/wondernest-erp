// src/pages/hr/HRDashboard.jsx
import { useQuery } from '@tanstack/react-query'
import {
  TeamOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  BankOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { supabase } from '../../lib/supabase'

// ---------- StatCard (same design as other dashboards) ----------
const StatCard = ({ icon: Icon, title, value, subtext, color }) => {
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const bgColor =
    color === 'primary' ? primaryColor :
    color === 'accent' ? '#FF1070' :
    darkMode ? '#2c2c2c' : '#f5f5f5'

  return (
    <div
      className="rounded-xl p-5 shadow-sm border transition-all"
      style={{ backgroundColor: cardBg, borderColor, fontFamily: fontBody }}
    >
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
  )
}

const HRDashboard = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const { selectedBranch } = useScope()
  const orgId = org?.id
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#141414' : '#f5f5f5'

  // Fetch teacher stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['hr-dashboard-stats', orgId, selectedBranch?.id],
    queryFn: async () => {
      if (!orgId) return null

      // Base query scoped to organisation
      let baseQuery = supabase
        .from('teachers')
        .select('id, status, branch_id, joining_date, monthly_salary', { count: 'exact' })
        .is('deleted_at', null)

      if (selectedBranch?.id) {
        baseQuery = baseQuery.eq('branch_id', selectedBranch.id)
      }

      const { data: teachers, error } = await baseQuery
      if (error) throw error

      const total = teachers?.length || 0
      const active = teachers?.filter(t => t.status === 'active').length || 0
      const inactive = total - active

      // Recent hires (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentHires = teachers?.filter(t => t.joining_date && new Date(t.joining_date) >= thirtyDaysAgo).length || 0

      // Total monthly salary for active teachers
      const totalMonthlySalary = teachers
        ?.filter(t => t.status === 'active')
        .reduce((sum, t) => sum + (Number(t.monthly_salary) || 0), 0) || 0

      // Branches covered
      const branchIds = [...new Set(teachers?.map(t => t.branch_id).filter(Boolean))]
      let branchCount = 0
      if (branchIds.length > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .in('id', branchIds)
          .eq('organization_id', orgId)
        branchCount = branches?.length || 0
      }

      return {
        total,
        active,
        inactive,
        recentHires,
        totalMonthlySalary,
        branchCount,
      }
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const s = stats || {}

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-0" style={{ backgroundColor: bgColor, fontFamily: fontBody }}>
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: primaryColor, fontFamily: fontHeading }}>
            HR Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: darkMode ? '#aaa' : '#666' }}>
            Overview of your teaching workforce.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/hr/employees/new"
            className="inline-flex items-center px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: primaryColor, fontFamily: fontBody }}
          >
            + New Employee
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={TeamOutlined}
          title="Total Teachers"
          value={isLoading ? '…' : s.total}
          subtext="All time"
          color="primary"
        />
        <StatCard
          icon={UserAddOutlined}
          title="Active Teachers"
          value={isLoading ? '…' : s.active}
          subtext={isLoading ? '' : `${s.inactive} inactive`}
          color="accent"
        />
        <StatCard
          icon={DollarOutlined}
          title="Monthly Salary"
          value={isLoading ? '…' : `₹${s.totalMonthlySalary.toLocaleString()}`}
          subtext="Active teachers only"
          color="primary"
        />
        <StatCard
          icon={BankOutlined}
          title="Branches Covered"
          value={isLoading ? '…' : s.branchCount}
          subtext="With at least 1 teacher"
          color="accent"
        />
        <StatCard
          icon={UserDeleteOutlined}
          title="Recent Hires"
          value={isLoading ? '…' : s.recentHires}
          subtext="Last 30 days"
          color="primary"
        />
      </div>

      {/* Additional widgets can be added here (attendance chart, salary chart, etc.) */}
    </div>
  )
}

export default HRDashboard