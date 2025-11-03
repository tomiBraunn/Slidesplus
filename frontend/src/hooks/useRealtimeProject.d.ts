declare module './useRealtimeProject.js' {
  interface Project {
    id: string;
    name: string;
    code: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  }

  export function useRealtimeProject(projectId: string | undefined): {
    project: Project | null;
    loading: boolean;
    error: Error | null;
  };
}
