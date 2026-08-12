import { useQuery } from "@tanstack/react-query";

import { api, qk } from "@/lib/api";

export const useStudents = () => useQuery({ queryKey: qk.students, queryFn: api.students });
export const useAttendance = () => useQuery({ queryKey: qk.attendance, queryFn: api.attendance });
export const useLessons = () => useQuery({ queryKey: qk.lessons, queryFn: api.lessons });
export const useAssignments = () =>
  useQuery({ queryKey: qk.assignments, queryFn: api.assignments });
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: api.projects });
export const useProgress = () => useQuery({ queryKey: qk.progress, queryFn: api.progress });
export const useLevels = () => useQuery({ queryKey: qk.levels, queryFn: api.levels });
export const useReports = () => useQuery({ queryKey: qk.reports, queryFn: api.reports });
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: api.settings });
export const useProgressHistory = (studentId?: string) =>
  useQuery({
    queryKey: qk.progressHistory(studentId),
    queryFn: () => api.progressHistory(studentId),
  });
