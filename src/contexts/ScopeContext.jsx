import { createContext, useContext } from "react";
import { useOrganization } from "./OrganizationContext";

const ScopeContext = createContext();

export function ScopeProvider({ children }) {
  const { selectedBranch, setSelectedBranch, branches, financialYears, selectedFinancialYear, setSelectedFinancialYear } = useOrganization();

  return (
    <ScopeContext.Provider value={{ selectedBranch, setSelectedBranch, branches, financialYears, selectedFinancialYear, setSelectedFinancialYear }}>
      {children}
    </ScopeContext.Provider>
  );
}

export const useScope = () => useContext(ScopeContext);