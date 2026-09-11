import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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

export interface Receipt {
  id: string;
  date: string;
  amount: number;
  imagePath: string;
  // Private-bucket files need a freshly-signed URL to actually display;
  // null until attachSignedUrls() fills it in after each fetch.
  signedUrl: string | null;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'Active' | 'Completed';
  dailyLogs: DailyLog[];
  receipts: Receipt[];
}

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  addProject: (name: string, location: string) => Promise<Project>;
  updateProject: (
    projectId: string,
    updates: { name: string; location: string; status: Project['status'] }
  ) => Promise<void>;
  addDailyLog: (projectId: string, log: Omit<DailyLog, 'id'>) => Promise<void>;
  updateDailyLog: (projectId: string, logId: string, updates: Omit<DailyLog, 'id'>) => Promise<void>;
  deleteDailyLog: (projectId: string, logId: string) => Promise<void>;
  addReceipt: (projectId: string, imageUri: string, date: string, amount: number) => Promise<void>;
  updateReceipt: (
    projectId: string,
    receiptId: string,
    updates: { date: string; amount: number; newImageUri?: string }
  ) => Promise<void>;
  deleteReceipt: (projectId: string, receiptId: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

// Maps a Supabase row (with nested daily_logs/labor_entries/equipment_entries)
// into the shape the rest of the app already expects.
function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? '',
    status: row.status,
    dailyLogs: (row.daily_logs ?? [])
      .map((log: any): DailyLog => ({
        id: log.id,
        date: log.date,
        workDescription: log.work_description ?? '',
        laborEntries: (log.labor_entries ?? []).map((entry: any): LaborEntry => ({
          id: entry.id,
          workerName: entry.worker_name ?? '',
          trade: entry.trade ?? '',
          stHours: Number(entry.st_hours) || 0,
          otHours: Number(entry.ot_hours) || 0,
        })),
        equipmentEntries: (log.equipment_entries ?? []).map((entry: any): EquipmentEntry => ({
          id: entry.id,
          equipmentName: entry.equipment_name ?? '',
          hoursUsed: Number(entry.hours_used) || 0,
        })),
      }))
      .sort((a: DailyLog, b: DailyLog) => (a.date < b.date ? 1 : -1)),
    receipts: (row.receipts ?? [])
      .map((receipt: any): Receipt => ({
        id: receipt.id,
        date: receipt.date,
        amount: Number(receipt.amount) || 0,
        imagePath: receipt.image_path,
        signedUrl: null,
      }))
      .sort((a: Receipt, b: Receipt) => (a.date < b.date ? 1 : -1)),
  };
}

// Private-bucket files aren't directly fetchable by URL — generate a
// short-lived signed URL for every receipt across every project in one
// batch call, then merge the results in.
async function attachSignedUrls(projects: Project[]): Promise<Project[]> {
  const paths = projects.flatMap((p) => p.receipts.map((r) => r.imagePath));
  if (paths.length === 0) return projects;

  const { data, error } = await supabase.storage.from('receipts').createSignedUrls(paths, 3600);
  if (error || !data) {
    console.error('Failed to sign receipt URLs:', error?.message);
    return projects;
  }

  const urlByPath = new Map(data.map((entry) => [entry.path, entry.signedUrl]));
  return projects.map((project) => ({
    ...project,
    receipts: project.receipts.map((receipt) => ({
      ...receipt,
      signedUrl: urlByPath.get(receipt.imagePath) ?? null,
    })),
  }));
}

const PROJECT_SELECT = '*, daily_logs(*, labor_entries(*), equipment_entries(*)), receipts(*)';

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Guards against a stale, slower fetch (e.g. one started for the previous
  // account) resolving after a newer one and overwriting it with the wrong
  // user's data. Only the most recently-started fetch is allowed to apply
  // its result.
  const fetchIdRef = useRef(0);

  const fetchProjects = async () => {
    const fetchId = ++fetchIdRef.current;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (fetchIdRef.current !== fetchId) return;

    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .order('created_at', { ascending: true });

    if (fetchIdRef.current !== fetchId) return;

    if (error) {
      console.error('Failed to load projects:', error.message);
      setProjects([]);
      setLoading(false);
      return;
    }

    const mapped = await attachSignedUrls((data ?? []).map(mapProjectRow));
    if (fetchIdRef.current !== fetchId) return;
    setProjects(mapped);
    setLoading(false);
  };

  useEffect(() => {
    // Initial data fetch on mount, not derived state — the rule below is
    // meant for the "sync state from props" anti-pattern, not this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setLoading(true);
        fetchProjects();
      } else if (event === 'SIGNED_OUT') {
        // Invalidate any fetch still in flight for the account we're
        // leaving, so it can't land after this and repopulate stale data.
        fetchIdRef.current += 1;
        setProjects([]);
        setLoading(true);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const addProject = async (name: string, location: string): Promise<Project> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in.');

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, location, status: 'Active' })
      .select()
      .single();

    if (error) throw error;

    const newProject = mapProjectRow({ ...data, daily_logs: [] });
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (
    projectId: string,
    updates: { name: string; location: string; status: Project['status'] }
  ) => {
    const { error } = await supabase
      .from('projects')
      .update({ name: updates.name, location: updates.location, status: updates.status })
      .eq('id', projectId);
    if (error) throw error;
    await fetchProjects();
  };

  const addDailyLog = async (projectId: string, log: Omit<DailyLog, 'id'>) => {
    const { data: logRow, error: logError } = await supabase
      .from('daily_logs')
      .insert({ project_id: projectId, date: log.date, work_description: log.workDescription })
      .select()
      .single();
    if (logError) throw logError;

    await writeEntries(logRow.id, log.laborEntries, log.equipmentEntries);
    await fetchProjects();
  };

  const updateDailyLog = async (projectId: string, logId: string, updates: Omit<DailyLog, 'id'>) => {
    const { error: logError } = await supabase
      .from('daily_logs')
      .update({ date: updates.date, work_description: updates.workDescription })
      .eq('id', logId);
    if (logError) throw logError;

    // Simplest correct approach: replace all child rows rather than diffing
    // which entries changed, since the form re-submits the full set each time.
    await supabase.from('labor_entries').delete().eq('daily_log_id', logId);
    await supabase.from('equipment_entries').delete().eq('daily_log_id', logId);
    await writeEntries(logId, updates.laborEntries, updates.equipmentEntries);
    await fetchProjects();
  };

  const writeEntries = async (
    dailyLogId: string,
    laborEntries: LaborEntry[],
    equipmentEntries: EquipmentEntry[]
  ) => {
    if (laborEntries.length > 0) {
      const { error } = await supabase.from('labor_entries').insert(
        laborEntries.map((entry) => ({
          daily_log_id: dailyLogId,
          worker_name: entry.workerName,
          trade: entry.trade,
          st_hours: entry.stHours,
          ot_hours: entry.otHours,
        }))
      );
      if (error) throw error;
    }

    if (equipmentEntries.length > 0) {
      const { error } = await supabase.from('equipment_entries').insert(
        equipmentEntries.map((entry) => ({
          daily_log_id: dailyLogId,
          equipment_name: entry.equipmentName,
          hours_used: entry.hoursUsed,
        }))
      );
      if (error) throw error;
    }
  };

  const deleteDailyLog = async (projectId: string, logId: string) => {
    const { error } = await supabase.from('daily_logs').delete().eq('id', logId);
    if (error) throw error;
    await fetchProjects();
  };

  const uploadReceiptImage = async (projectId: string, imageUri: string): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in.');

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const path = `${user.id}/${projectId}/${fileName}`;

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    return path;
  };

  const addReceipt = async (projectId: string, imageUri: string, date: string, amount: number) => {
    const path = await uploadReceiptImage(projectId, imageUri);

    const { error: insertError } = await supabase
      .from('receipts')
      .insert({ project_id: projectId, date, amount, image_path: path });
    if (insertError) throw insertError;

    await fetchProjects();
  };

  const updateReceipt = async (
    projectId: string,
    receiptId: string,
    updates: { date: string; amount: number; newImageUri?: string }
  ) => {
    const existing = getProject(projectId)?.receipts.find((r) => r.id === receiptId);

    const updateFields: { date: string; amount: number; image_path?: string } = {
      date: updates.date,
      amount: updates.amount,
    };

    if (updates.newImageUri) {
      updateFields.image_path = await uploadReceiptImage(projectId, updates.newImageUri);
    }

    const { error } = await supabase.from('receipts').update(updateFields).eq('id', receiptId);
    if (error) throw error;

    // Best-effort cleanup of the old file — the update above already
    // succeeded, so don't fail the whole operation if this doesn't.
    if (updates.newImageUri && existing?.imagePath) {
      await supabase.storage.from('receipts').remove([existing.imagePath]);
    }

    await fetchProjects();
  };

  const deleteReceipt = async (projectId: string, receiptId: string) => {
    const existing = getProject(projectId)?.receipts.find((r) => r.id === receiptId);

    const { error } = await supabase.from('receipts').delete().eq('id', receiptId);
    if (error) throw error;

    if (existing?.imagePath) {
      await supabase.storage.from('receipts').remove([existing.imagePath]);
    }

    await fetchProjects();
  };

  const getProject = (id: string) => projects.find((p) => p.id === id);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        addProject,
        updateProject,
        addDailyLog,
        updateDailyLog,
        deleteDailyLog,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        getProject,
      }}
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
