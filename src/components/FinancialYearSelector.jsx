import { Select, Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'

const { Option } = Select

const FinancialYearSelector = ({ value, onChange, style = {} }) => {
  const { org } = useOrganization()
  const orgId = org?.id

  const { data: years, isLoading } = useQuery({
    queryKey: ['financial-years', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data } = await supabase
        .from('financial_years')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
      return data || []
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <Skeleton.Input style={{ width: 150, ...style }} active size="small" />
  if (!years?.length) return null

  return (
    <Select
      placeholder="Financial Year"
      value={value}
      onChange={onChange}
      style={{ width: 180, ...style }}
      allowClear
    >
      {years.map(y => (
        <Option key={y.id} value={y.id}>{y.name}</Option>
      ))}
    </Select>
  )
}

export default FinancialYearSelector