import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DEFAULT_ORG_ID = 3; // Replace with your actual org id

const OrganizationContext = createContext();

export const useOrganization = () => useContext(OrganizationContext);

export const OrganizationProvider = ({ children }) => {
  const { profile } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(null);

  const fetchOrg = async () => {
    setLoading(true);
    setError(null);

    // Use the user's organization if logged in, otherwise fall back to the default org id
    const orgId = profile?.organization_id || DEFAULT_ORG_ID;

    const { data, error } = await supabase
      .from('organization')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOrg(data);

    // Fetch branches
    const { data: branchList } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', data.id)
      .eq('is_active', true)
      .order('branch_name');

    setBranches(branchList || []);
    if (branchList?.length) {
      // If the user has a specific branch (e.g., branch_admin), prefer that
      const userBranch = profile?.branch_id
        ? branchList.find((b) => b.id === profile.branch_id)
        : null;
      setSelectedBranch(userBranch || branchList[0]);
    } else {
      setSelectedBranch(null);
    }

    // Fetch financial years
    const { data: fyList } = await supabase
      .from('financial_years')
      .select('*')
      .eq('organization_id', data.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    setFinancialYears(fyList || []);
    setSelectedFinancialYear(fyList?.[0] || null);

    setLoading(false);
  };

  useEffect(() => {
    fetchOrg();
  }, [profile?.organization_id]);

  return (
    <OrganizationContext.Provider
      value={{
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
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};