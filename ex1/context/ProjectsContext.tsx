import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LaborEntry {
  id: string;
  workerName: string;
  trade: string;
  stHours: number;
  otHours: number;
}

export interface EquipmentEntry {
  id: string;
  equipmentName: string;
  hoursUsed: number;
}

export interface DailyLog {
  id: string;
  date: string;
  workDescription: string;
  laborEntries: LaborEntry[];
  equipmentEntries: EquipmentEntry[];
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'Active' | 'Completed';
  dailyLogs: DailyLog[];
}

interface ProjectsContextValue {
  projects: Project[];
  addProject: (name: string, location: string) => Project;
  addDailyLog: (projectId: string, log: Omit<DailyLog, 'id'>) => void;
  updateDailyLog: (projectId: string, logId: string, updates: Omit<DailyLog, 'id'>) => void;
  deleteDailyLog: (projectId: string, logId: string) => void;
  getProject: (id: string) => Project | undefined;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

const initialProjects: Project[] = [];

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const addProject = (name: string, location: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      location,
      status: 'Active',
      dailyLogs: [],
    };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };

  const addDailyLog = (projectId: string, log: Omit<DailyLog, 'id'>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              dailyLogs: [{ ...log, id: Date.now().toString() }, ...project.dailyLogs],
            }
          : project
      )
    );
  };

  const updateDailyLog = (projectId: string, logId: string, updates: Omit<DailyLog, 'id'>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              dailyLogs: project.dailyLogs.map((log) =>
                log.id === logId ? { ...updates, id: logId } : log
              ),
            }
          : project
      )
    );
  };

  const deleteDailyLog = (projectId: string, logId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, dailyLogs: project.dailyLogs.filter((log) => log.id !== logId) }
          : project
      )
    );
  };

  const getProject = (id: string) => projects.find((p) => p.id === id);

  return (
    <ProjectsContext.Provider
      value={{ projects, addProject, addDailyLog, updateDailyLog, deleteDailyLog, getProject }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
