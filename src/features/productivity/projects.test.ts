import { beforeEach, describe, expect, it } from 'vitest';
import { projectService, resetProjectMocks } from '@/features/productivity/services/project.service';
import { PROD_ACTORS } from '@/features/productivity/mock-data';
import { TASK_TRANSITIONS } from '@/features/productivity/rules';
import { resetSettingsMocks, settingsService } from '@/features/settings/services/settings.service';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';

const actor = (id: string) => PROD_ACTORS.find((row) => row.employeeId === id)!;
const DEDI = actor('emp-dedi');
const RINA = actor('emp-rina-amelia');
const HESTI = actor('emp-hesti');
const FAJAR = actor('emp-fajar');
const PRJ_1 = 'c1000000-0000-7000-8000-000000000001';
const PRJ_2 = 'c1000000-0000-7000-8000-000000000002';
const PRJ_3 = 'c1000000-0000-7000-8000-000000000003';
const TSK_1 = 'e2000000-0000-7000-8000-000000000001';
const TSK_2 = 'e2000000-0000-7000-8000-000000000002';
const TSK_3 = 'e2000000-0000-7000-8000-000000000003';
const CAT_RAPAT = 'f3000000-0000-7000-8000-000000000003';
const CAT_LAIN = 'f3000000-0000-7000-8000-000000000006';

beforeEach(() => {
  resetProjectMocks();
  resetSettingsMocks();
});

describe('Project', () => {
  it('proyek lahir AKTIF dengan pemilik dari token', async () => {
    const row = await projectService.createProject(FAJAR, 'Dashboard Analitik');
    expect(row).toMatchObject({ state: 'AKTIF', ownerEmployeeId: 'emp-fajar', code: 'PRJ-0004' });
  });

  it('arsip ditolak 422 selama ada task terbuka; lolos bila nol; restore mengosongkan archived_at', async () => {
    await expect(projectService.updateProject(DEDI, PRJ_1, { state: 'ARSIP' })).rejects.toMatchObject({
      status: 422,
      code: 'PROD_PROJECT_ARCHIVE_HAS_OPEN_TASK',
    });
    const archived = await projectService.updateProject(RINA, PRJ_3, { state: 'ARSIP' });
    expect(archived.archivedAt).not.toBeNull();
    const restored = await projectService.updateProject(DEDI, PRJ_2, { state: 'AKTIF' });
    expect(restored).toMatchObject({ state: 'AKTIF', archivedAt: null, archivedAtTimezone: null });
  });

  it('hanya pemilik atau HR yang mengubah; anggota peninjau tidak', async () => {
    await expect(projectService.updateProject(RINA, PRJ_1, { projectName: 'X' })).rejects.toMatchObject({
      status: 403,
      code: 'PROD_NOT_OBJECT_OWNER',
    });
    await expect(
      projectService.updateProject(HESTI, PRJ_1, { projectName: 'Migrasi Server Q4' }),
    ).resolves.toMatchObject({ projectName: 'Migrasi Server Q4' });
  });

  it('keanggotaan upsert: baru 201, keluarkan menonaktifkan, tambah lagi dipulihkan, ulang no-op', async () => {
    expect(await projectService.addMember(DEDI, PRJ_1, 'emp-fajar')).toBe('CREATED');
    await projectService.removeMember(DEDI, PRJ_1, 'emp-fajar');
    expect((await projectService.members(PRJ_1)).map((row) => row.employeeId)).toEqual(['emp-rina-amelia']);
    expect(await projectService.addMember(DEDI, PRJ_1, 'emp-fajar')).toBe('RESTORED');
    expect(await projectService.addMember(DEDI, PRJ_1, 'emp-fajar')).toBe('NOOP');
  });
});

describe('Task', () => {
  it('task_origin ditentukan server; penugasan ke luar rantai ditolak; proyek arsip ditolak', async () => {
    const base = {
      taskTitle: 'Uji',
      description: '',
      projectId: '',
      taskCategoryId: '',
      priority: 'SEDANG' as const,
      dueDate: '2026-10-10',
    };
    const self = await projectService.createTask(DEDI, { ...base, assigneeEmployeeId: 'emp-dedi' });
    expect(self).toMatchObject({
      taskOrigin: 'DIBUAT_SENDIRI',
      assignerEmployeeId: null,
      originalDueDate: '2026-10-10',
    });
    const assigned = await projectService.createTask(RINA, { ...base, assigneeEmployeeId: 'emp-dedi' });
    expect(assigned).toMatchObject({ taskOrigin: 'DITUGASKAN', assignerEmployeeId: 'emp-rina-amelia' });
    await expect(projectService.createTask(DEDI, { ...base, assigneeEmployeeId: 'emp-fajar' })).rejects.toMatchObject({
      status: 403,
      code: 'PROD_TASK_ASSIGN_NOT_AUTHORIZED',
    });
    await expect(
      projectService.createTask(DEDI, { ...base, assigneeEmployeeId: 'emp-dedi', projectId: PRJ_2 }),
    ).rejects.toMatchObject({ status: 422, code: 'PROD_PROJECT_ARCHIVED' });
  });

  it('diagram status beku (TSD 0.18): BELUM tidak boleh langsung TERTAHAN; akhir hanya SELESAI ↔ DIBATALKAN', () => {
    expect(TASK_TRANSITIONS.BELUM_DIKERJAKAN).not.toContain('TERTAHAN');
    expect(TASK_TRANSITIONS.BELUM_DIKERJAKAN).toContain('SELESAI');
    expect(TASK_TRANSITIONS.TERTAHAN).toContain('DIBATALKAN');
    expect(TASK_TRANSITIONS.SELESAI).toEqual(['DIBATALKAN']);
  });

  it('keluar TERTAHAN menulis riwayat STATUS; transisi tak sah 422', async () => {
    await projectService.updateTask(DEDI, TSK_3, { status: 'SEDANG_DIKERJAKAN' });
    const history = await projectService.taskHistory(DEDI, TSK_3);
    expect(history[0]).toMatchObject({ changedField: 'STATUS', oldValue: 'TERTAHAN', newValue: 'SEDANG_DIKERJAKAN' });
    await expect(projectService.updateTask(DEDI, TSK_2, { status: 'SEDANG_DIKERJAKAN' })).rejects.toMatchObject({
      status: 422,
      code: 'PROD_TASK_STATUS_TRANSITION_INVALID',
    });
  });

  it('pembukaan-kembali digerbangi jendela productivity.entry_window_days dari Settings', async () => {
    // TSK-0002 ditutup 18 Juli 2026 — jauh di luar jendela 7 hari.
    await expect(projectService.updateTask(DEDI, TSK_2, { status: 'DIBATALKAN' })).rejects.toMatchObject({
      status: 422,
      code: 'PROD_ENTRY_WINDOW_CLOSED',
    });
    await settingsService.write(SETTINGS_VIEWERS[0], [
      { setupCode: 'productivity.entry_window_days', setupValue: [3650] },
    ]);
    await expect(projectService.updateTask(DEDI, TSK_2, { status: 'DIBATALKAN' })).resolves.toMatchObject({
      status: 'DIBATALKAN',
    });
  });

  it('tenggat task DITUGASKAN hanya penugas/atasan; mundur wajib beralasan', async () => {
    await expect(projectService.updateTask(DEDI, TSK_1, { dueDate: '2026-08-20' })).rejects.toMatchObject({
      status: 403,
    });
    await expect(projectService.updateTask(RINA, TSK_1, { dueDate: '2026-08-20' })).rejects.toMatchObject({
      status: 422,
      code: 'PROD_TASK_DUE_DATE_REASON_REQUIRED',
    });
    await projectService.updateTask(RINA, TSK_1, { dueDate: '2026-08-20', changeReason: 'Vendor terlambat' });
    const [latest] = await projectService.taskHistory(RINA, TSK_1);
    expect(latest).toMatchObject({
      changedField: 'DUE_DATE',
      newValue: '2026-08-20',
      changeReason: 'Vendor terlambat',
    });
  });

  it('cakupan daftar: saya, yang saya tugaskan, tim, semua (HR saja)', async () => {
    expect((await projectService.tasks(DEDI, { scope: 'MINE' })).map((row) => row.code).sort()).toEqual([
      'TSK-0001',
      'TSK-0002',
      'TSK-0003',
    ]);
    expect((await projectService.tasks(RINA, { scope: 'ASSIGNED_BY_ME' })).length).toBe(2);
    expect((await projectService.tasks(RINA, { scope: 'TEAM' })).length).toBe(4);
    await expect(projectService.tasks(DEDI, { scope: 'ALL' })).rejects.toMatchObject({ status: 403 });
    expect((await projectService.tasks(HESTI, { scope: 'ALL' })).length).toBe(4);
  });
});

describe('Kategori Task', () => {
  it('HR saja; nama aktif unik; hapus ditolak 409 bila pernah dipakai', async () => {
    await expect(projectService.saveCategory(DEDI, { categoryName: 'Riset' })).rejects.toMatchObject({ status: 403 });
    await expect(projectService.saveCategory(HESTI, { categoryName: 'dokumentasi' })).rejects.toMatchObject({
      status: 409,
    });
    await expect(projectService.deleteCategory(HESTI, CAT_RAPAT)).rejects.toMatchObject({
      status: 409,
      code: 'PROD_TASK_CATEGORY_IN_USE',
    });
    await projectService.deleteCategory(HESTI, CAT_LAIN);
    const rows = await projectService.categories();
    expect(rows).toHaveLength(5);
    expect(rows.filter((row) => row.inUse)).toHaveLength(3);
  });
});
