import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as courseApi from '../api/courses'

// ---------- Courses (root courses only) ----------
export const useCourses = () => 
  useQuery({ 
    queryKey: ['courses'], 
    queryFn: courseApi.fetchCourses 
  })

export const useCreateCourse = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.createCourse, 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }) 
  })
}

export const useUpdateCourse = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: ({ id, ...upd }) => courseApi.updateCourse(id, upd), 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }) 
  })
}

export const useDeleteCourse = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.deleteCourse, 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }) 
  })
}

// ---------- Levels (now stored in courses with parent_id = courseId) ----------
export const useCourseLevels = (courseId) =>
  useQuery({ 
    queryKey: ['course-levels', courseId], 
    queryFn: () => courseApi.fetchCourseLevels(courseId), 
    enabled: !!courseId 
  })

export const useCreateCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.createCourseLevel, 
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['course-levels', vars.parent_id] }) 
  })
}

export const useUpdateCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: ({ id, ...upd }) => courseApi.updateCourseLevel(id, upd), 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-levels'] }) 
  })
}

export const useDeleteCourseLevel = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.deleteCourseLevel, 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-levels'] }) 
  })
}

// ---------- Fees (now stored as inventory_items services) ----------
// Fetch fees for a course (optionally for a specific level)
export const useCourseFees = (courseId, levelId = null) =>
  useQuery({ 
    queryKey: ['course-fees', courseId, levelId], 
    queryFn: () => courseApi.fetchCourseFees(courseId, levelId), 
    enabled: !!courseId 
  })

export const useSaveCourseFee = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.createOrUpdateCourseFee, 
    onSuccess: (_, vars) => {
      // Invalidate both course-level fees and level-specific fees
      qc.invalidateQueries({ queryKey: ['course-fees', vars.course_id] })
      if (vars.level_id) {
        qc.invalidateQueries({ queryKey: ['course-fees', vars.course_id, vars.level_id] })
      }
    }
  })
}

export const useDeleteCourseFee = () => {
  const qc = useQueryClient()
  return useMutation({ 
    mutationFn: courseApi.deleteCourseFee, 
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-fees'] }) 
  })
}

// ---------- Helper: get fee for admission ----------
export const useFeeItemForAdmission = (courseId, levelId = null) =>
  useQuery({
    queryKey: ['fee-item', courseId, levelId],
    queryFn: () => courseApi.getFeeItemForAdmission(courseId, levelId),
    enabled: !!courseId
  })

// ---------- Optional: fetch all courses including levels (for admin) ----------
// This returns both root courses and levels in a flat list
export const useAllCourses = (includeLevels = false) => {
  return useQuery({
    queryKey: ['all-courses', includeLevels],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .is('deleted_at', null)
        .order('name')

      if (!includeLevels) {
        query = query.is('parent_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: true
  })
}