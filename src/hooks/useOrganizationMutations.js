import { useMutation } from '@tanstack/react-query'
import { updateOrganization } from '../api/organization'
import { useOrganization } from '../contexts/OrganizationContext'

export const useUpdateOrganization = () => {
  const { refetchOrg } = useOrganization()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateOrganization(id, updates),
    onSuccess: () => {
      refetchOrg()   // refresh the context after successful update
    },
  })
}