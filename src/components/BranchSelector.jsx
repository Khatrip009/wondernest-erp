import { Select, Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'

const { Option } = Select

const BranchSelector = ({ value, onChange, style = {} }) => {
  const { org } = useOrganization()
  const orgId = org?.id

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data } = await supabase
        .from('branches')
        .select('id, branch_name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('branch_name')
      return data || []
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <Skeleton.Input style={{ width: 150, ...style }} active size="small" />
  if (!branches?.length) return null

  return (
    <Select
      placeholder="Select Branch"
      value={value}
      onChange={onChange}
      style={{ width: 200, ...style }}
      allowClear
    >
      {branches.map(b => (
        <Option key={b.id} value={b.id}>{b.branch_name}</Option>
      ))}
    </Select>
  )
}

export default BranchSelector