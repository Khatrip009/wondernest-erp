import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as courseApi from '../api/courses'
import { useOrganization } from '../contexts/OrganizationContext'
import { supabase } from '../lib/supabase'

// ---------- Courses (top-level programmes only) ----------
export const useCourses = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['courses', org?.id],
    queryFn: () => courseApi.fetchCourses(org?.id),
    enabled: !!org?.id,
  })
}

export const useCreateCourse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.createCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export const useUpdateCourse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...upd }) => courseApi.updateCourse(id, upd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export const useDeleteCourse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

// ---------- Course Levels (now in course_levels table) ----------
export const useCourseLevels = (courseId) => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['course-levels', courseId, org?.id],
    queryFn: () => courseApi.fetchCourseLevels(courseId, org?.id),
    enabled: !!courseId && !!org?.id,
  })
}

export const useCreateCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.createCourseLevel,
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['course-levels', vars.course_id] }), // payload now uses course_id
  })
}

export const useUpdateCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...upd }) => courseApi.updateCourseLevel(id, upd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-levels'] }),
  })
}

export const useDeleteCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.deleteCourseLevel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-levels'] }),
  })
}

// ---------- Fees (services from inventory_items) ----------
export const useCourseFees = (courseId, levelId = null) =>
  useQuery({
    queryKey: ['course-fees', courseId, levelId],
    queryFn: () => courseApi.fetchCourseFees(courseId, levelId),
    enabled: !!courseId,
  })

export const useSaveCourseFee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.createOrUpdateCourseFee,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['course-fees', vars.course_id] })
      if (vars.level_id) {
        qc.invalidateQueries({ queryKey: ['course-fees', vars.course_id, vars.level_id] })
      }
    },
  })
}

export const useDeleteCourseFee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: courseApi.deleteCourseFee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-fees'] }),
  })
}

// ---------- Helper: get fee for admission ----------
export const useFeeItemForAdmission = (courseId, levelId = null) =>
  useQuery({
    queryKey: ['fee-item', courseId, levelId],
    queryFn: () => courseApi.getFeeItemForAdmission(courseId, levelId),
    enabled: !!courseId,
  })

// ---------- Fetch all courses (no parent_id filter needed) ----------
export const useAllCourses = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['all-courses', org?.id],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (org?.id) {
        query = query.eq('organization_id', org.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!org?.id,
  })
}