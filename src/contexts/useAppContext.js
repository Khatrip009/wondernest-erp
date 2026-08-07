import { useOrganization } from './OrganizationContext'
import { useTheme } from './ThemeContext'
import { useAuth } from './AuthContext'

export const useAppContext = () => {
  const org = useOrganization()
  const theme = useTheme()
  const auth = useAuth()
  return { ...org, ...theme, ...auth }
}