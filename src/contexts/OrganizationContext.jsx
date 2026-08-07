import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const OrganizationContext = createContext()

export const useOrganization = () => useContext(OrganizationContext)

export const OrganizationProvider = ({ children }) => {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [branches, setBranches] = useState([])
  const [financialYears, setFinancialYears] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(null)

  const fetchOrg = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('organization')
      .select('*')
      .eq('id', 3)
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setOrg(data)

    // Fetch branches
    const { data: branchList } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', data.id)
      .eq('is_active', true)
      .order('branch_name')
    setBranches(branchList || [])
    if (branchList?.length) setSelectedBranch(branchList[0])

    // Fetch financial years
    const { data: fyList } = await supabase
      .from('financial_years')
      .select('*')
      .eq('organization_id', data.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
    setFinancialYears(fyList || [])
    if (fyList?.length) setSelectedFinancialYear(fyList[0])

    setLoading(false)
  }

  useEffect(() => {
    fetchOrg()
  }, [])

  return (
    <OrganizationContext.Provider value={{
      org,
      loading,
      error,
      refetchOrg: fetchOrg,
      branches,
      financialYears,
      selectedBranch,
      setSelectedBranch,
      selectedFinancialYear,
      setSelectedFinancialYear,
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}