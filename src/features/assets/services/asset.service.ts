import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  ASSET_SEED,
  CATEGORY_SEED,
  EMPLOYEE_OPTIONS,
  HANDOVER_SEED,
  MAINTENANCE_SEED,
  TRANSFER_SEED,
} from '@/features/assets/mock-data';
import {
  blockerReasons,
  canAssign,
  canDispose,
  canLease,
  canReturn,
  canTransfer,
  canWriteAssets,
  isTerminal,
  nextMaintenanceDate,
  parseAmount,
} from '@/features/assets/rules';
import type {
  Asset,
  AssetActor,
  AssetCategory,
  AssetDraft,
  AssetStatus,
  DisposalDraft,
  DisposalLog,
  HandoverLog,
  LeaseLog,
  MaintenanceLog,
  MaintenanceType,
  PersonSnapshot,
  ResidualLog,
  ReturnStatus,
  TransferLog,
} from '@/features/assets/types';

/**
 * API service Assets (UIC-001-COMPANY-0.25 §3.1–§3.3, FSD-COMPANY 0.35 §7–§9).
 *
 * Registri, kategori, aksi lifecycle, dan Disposal. Tiap aksi menulis log append-only miliknya
 * sendiri (handover/transfer/maintenance/lease/residual/disposal) dan memperbarui state master
 * dalam satu transaksi. Seluruh tulis dijaga matriks peran §7.0: HR_MANAGER/DEPARTMENT_MANAGER
 * hanya lihat (403). Alamat lifecycle FLAT (`POST /asset-leases`, `/asset-residuals`, …) dan
 * riwayat lewat `POST /asset-{resource}/search`, sesuai koreksi UIC 0.25.
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

let categories: AssetCategory[] = [];
let assets: Asset[] = [];
let handovers: HandoverLog[] = [];
let maintenances: MaintenanceLog[] = [];
let transfers: TransferLog[] = [];
let leases: LeaseLog[] = [];
let residuals: ResidualLog[] = [];
let disposals: DisposalLog[] = [];
let sequence = 0;

export function resetAssetMocks() {
  categories = CATEGORY_SEED.map((row) => ({ ...row }));
  assets = ASSET_SEED.map((row) => ({ ...row, employeeInfo: row.employeeInfo ? { ...row.employeeInfo } : null }));
  handovers = HANDOVER_SEED.map((row) => ({ ...row }));
  maintenances = MAINTENANCE_SEED.map((row) => ({ ...row }));
  transfers = TRANSFER_SEED.map((row) => ({ ...row }));
  leases = [];
  residuals = [];
  disposals = [];
  sequence = 0;
}
resetAssetMocks();

const nextId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;

function requireWrite(actor: AssetActor) {
  if (!canWriteAssets(actor.role)) {
    throw new Error(
      '403 — peran ini hanya boleh melihat aset; perubahan milik Super Admin, System Admin, dan GA Staff.',
    );
  }
}

const snapshotOf = (employeeId: string): PersonSnapshot => {
  const person = EMPLOYEE_OPTIONS.find((row) => row.employeeId === employeeId);
  if (!person) throw new Error('404 NOT_FOUND — karyawan tidak ditemukan.');
  return { ...person };
};

function findAsset(id: string): Asset {
  const row = assets.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — aset tidak ditemukan.');
  return row;
}

/** NOT_AVAILABLE bila ada blocker, AVAILABLE bila tidak — hanya untuk dua status itu. */
function settleAvailability(row: Asset) {
  if (row.lastAssetStatus !== 'AVAILABLE' && row.lastAssetStatus !== 'NOT_AVAILABLE') return;
  row.lastAssetStatus = blockerReasons(row).length ? 'NOT_AVAILABLE' : 'AVAILABLE';
}

export interface AssetHistory {
  handovers: HandoverLog[];
  maintenances: MaintenanceLog[];
  transfers: TransferLog[];
  leases: LeaseLog[];
  residuals: ResidualLog[];
  disposals: DisposalLog[];
}

export const assetService = {
  // ---------- Kategori ----------

  async categories(): Promise<AssetCategory[]> {
    if (MOCK) {
      await delay(150);
      return categories.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: AssetCategory[] }>('/asset-categories/search', {});
    return data.data;
  },

  async saveCategory(
    actor: AssetActor,
    draft: { name: string; maintenanceIntervalDays: string },
    id?: string,
  ): Promise<AssetCategory> {
    if (MOCK) {
      await delay(220);
      requireWrite(actor);
      const name = draft.name.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama kategori wajib diisi.');
      if (categories.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — kategori ${name} sudah ada.`);
      }
      const interval = draft.maintenanceIntervalDays.trim() ? Number(draft.maintenanceIntervalDays) : null;
      if (interval !== null && (!Number.isInteger(interval) || interval < 1)) {
        throw new Error('422 VALIDATION_ERROR — interval maintenance wajib bilangan bulat mulai 1.');
      }
      if (id) {
        const row = categories.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — kategori tidak ditemukan.');
        Object.assign(row, { name, maintenanceIntervalDays: interval });
        return { ...row };
      }
      const row: AssetCategory = { id: nextId('cat'), name, maintenanceIntervalDays: interval, createdAt: now() };
      categories.push(row);
      return { ...row };
    }
    const { data } = await api.post<AssetCategory>('/asset-categories', draft);
    return data;
  },

  async deleteCategory(actor: AssetActor, id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      requireWrite(actor);
      if (assets.some((row) => row.assetCategoryId === id)) {
        throw new Error('409 — kategori ini masih dipakai aset aktif.');
      }
      categories = categories.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/asset-categories/${id}`);
    return data;
  },

  // ---------- Registri ----------

  async assets(filter: { statuses?: AssetStatus[]; search?: string } = {}): Promise<Asset[]> {
    if (MOCK) {
      await delay();
      const query = filter.search?.trim().toLowerCase() ?? '';
      return assets
        .filter((row) => !filter.statuses?.length || filter.statuses.includes(row.lastAssetStatus))
        .filter(
          (row) => !query || row.assetName.toLowerCase().includes(query) || row.assetCode.toLowerCase().includes(query),
        )
        .map((row) => ({ ...row }))
        .sort((a, b) => a.assetCode.localeCompare(b.assetCode));
    }
    const { data } = await api.post<{ data: Asset[] }>('/assets/search', { filters: filter });
    return data.data;
  },

  async asset(id: string): Promise<Asset> {
    if (MOCK) {
      await delay(150);
      return { ...findAsset(id) };
    }
    const { data } = await api.get<Asset>(`/assets/${id}`);
    return data;
  },

  /**
   * Registrasi bercabang OWNED vs LEASED (§7.3). Branch/kategori/foto kosong tidak menolak —
   * aset tetap lahir (201) sebagai NOT_AVAILABLE. Blok pembelian/sewa yang tidak lengkap MENOLAK
   * (422 Mandatory-by-Value). `serial_number` wajib (`@NotBlank`, 0.35). Tanggal beli tidak boleh
   * melewati hari ini. Berkas kontrak sewa sengaja tidak diterima di sini (asimetri §7.3).
   */
  async register(actor: AssetActor, draft: AssetDraft): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const code = draft.assetCode.trim().toUpperCase();
      const name = draft.assetName.trim();
      const serial = draft.serialNumber.trim();
      if (!code) throw new Error('422 VALIDATION_ERROR — kode aset wajib diisi.');
      if (!name) throw new Error('422 VALIDATION_ERROR — nama aset wajib diisi.');
      if (!serial) throw new Error('422 VALIDATION_ERROR — serial number wajib diisi.');
      if (assets.some((row) => row.assetCode === code)) {
        throw new Error(`409 — kode aset ${code} sudah dipakai aset aktif lain.`);
      }

      const owned = draft.ownershipType === 'OWNED';
      let purchasePrice: number | null = null;
      let leaseAmount: number | null = null;
      if (owned) {
        purchasePrice = parseAmount(draft.purchasePrice);
        if (purchasePrice === null)
          throw new Error('422 VALIDATION_ERROR — harga beli wajib untuk aset milik sendiri.');
        if (!draft.purchaseInvoiceNumber.trim()) {
          throw new Error('422 VALIDATION_ERROR — nomor faktur wajib untuk aset milik sendiri.');
        }
        if (!draft.purchaseDate) throw new Error('422 VALIDATION_ERROR — tanggal beli wajib untuk aset milik sendiri.');
        if (draft.purchaseDate > now().slice(0, 10)) {
          throw new Error('422 VALIDATION_ERROR — tanggal beli tidak boleh melewati hari ini.');
        }
      } else {
        leaseAmount = parseAmount(draft.leaseAmount);
        if (leaseAmount === null) throw new Error('422 VALIDATION_ERROR — nilai sewa wajib untuk aset sewaan.');
        if (!draft.leaseStartDate || !draft.leaseEndDate) {
          throw new Error('422 VALIDATION_ERROR — tanggal mulai dan akhir sewa wajib diisi.');
        }
        if (draft.leaseEndDate < draft.leaseStartDate) {
          throw new Error('422 VALIDATION_ERROR — akhir sewa tidak boleh sebelum mulai sewa.');
        }
        if (!draft.leaseContractNumber.trim())
          throw new Error('422 VALIDATION_ERROR — nomor kontrak sewa wajib diisi.');
        if (!draft.vendorId) throw new Error('422 VALIDATION_ERROR — vendor wajib untuk aset sewaan.');
      }

      const row: Asset = {
        id: nextId('as'),
        assetCode: code,
        assetName: name,
        serialNumber: serial,
        assetCategoryId: draft.assetCategoryId || null,
        branchId: draft.branchId || null,
        ownershipType: draft.ownershipType,
        photo1: draft.photo1 || null,
        photo1Note: null,
        purchaseDate: owned ? draft.purchaseDate : null,
        purchasePrice,
        purchaseInvoiceNumber: owned ? draft.purchaseInvoiceNumber.trim() : null,
        purchaseInvoiceFile: null,
        leaseAmount,
        leaseStartDate: owned ? null : draft.leaseStartDate,
        leaseEndDate: owned ? null : draft.leaseEndDate,
        leaseContractNumber: owned ? null : draft.leaseContractNumber.trim(),
        vendorId: owned ? null : draft.vendorId,
        currentLeaseContractFile: null,
        lastAssetStatus: 'AVAILABLE',
        currentHandoverStatus: 'NONE',
        employeeId: null,
        employeeInfo: null,
        currentResidualValue: purchasePrice,
        nextMaintenanceDate: null,
        createdAt: now(),
      };
      settleAvailability(row);
      assets.push(row);
      return { ...row };
    }
    const { data } = await api.post<Asset>('/assets', draft);
    return data;
  },

  /** Pintu relay `POST /assets/{id}/files` — foto menyusul; blocker foto terangkat bila tinggal itu. */
  async uploadPhoto(actor: AssetActor, id: string): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findAsset(id);
      if (isTerminal(row.lastAssetStatus)) throw new Error('422 — aset terminal tidak menerima berkas baru.');
      row.photo1 = `doc-photo-${row.assetCode.toLowerCase()}`;
      settleAvailability(row);
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/files`, { field: 'photo1' });
    return data;
  },

  // ---------- Riwayat — POST /asset-*/search per resource ----------

  async history(id: string): Promise<AssetHistory> {
    if (MOCK) {
      await delay(150);
      const byAsset = <T extends { assetId: string; createdAt: string }>(rows: T[]) =>
        rows
          .filter((row) => row.assetId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((row) => ({ ...row }));
      return {
        handovers: byAsset(handovers),
        maintenances: byAsset(maintenances),
        transfers: byAsset(transfers),
        leases: byAsset(leases),
        residuals: byAsset(residuals),
        disposals: byAsset(disposals),
      };
    }
    const search = async <T>(resource: string) =>
      (await api.post<{ data: T[] }>(`/asset-${resource}/search`, { filters: { asset_id: id } })).data.data;
    const [h, m, t, l, r, d] = await Promise.all([
      search<HandoverLog>('handovers'),
      search<MaintenanceLog>('maintenances'),
      search<TransferLog>('transfers'),
      search<LeaseLog>('leases'),
      search<ResidualLog>('residuals'),
      search<DisposalLog>('disposals'),
    ]);
    return { handovers: h, maintenances: m, transfers: t, leases: l, residuals: r, disposals: d };
  },

  // ---------- Lifecycle ----------

  /** Assign (GIVING): `is_complete` true → ASSIGNED, false → INCOMPLETE (tetap dipegang). */
  async assign(
    actor: AssetActor,
    id: string,
    payload: { employeeId: string; isComplete: boolean; note: string },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      requireWrite(actor);
      const row = findAsset(id);
      if (!canAssign(row)) {
        throw new Error(
          row.lastAssetStatus === 'NOT_AVAILABLE'
            ? `422 — aset masih terblokir: ${blockerReasons(row).join(', ')}.`
            : '422 — hanya aset berstatus Tersedia yang bisa diserahkan.',
        );
      }
      const info = snapshotOf(payload.employeeId);
      Object.assign(row, {
        employeeId: info.employeeId,
        employeeInfo: info,
        lastAssetStatus: payload.isComplete ? 'ASSIGNED' : 'INCOMPLETE',
        currentHandoverStatus: 'GIVING',
      });
      handovers.push({
        id: nextId('ho'),
        assetId: id,
        event: 'GIVING',
        employeeInfo: info,
        isComplete: payload.isComplete,
        assetStatus: null,
        assetLocation: null,
        note: payload.note.trim() || null,
        createdAt: now(),
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-handovers', { asset_id: id, event: 'GIVING', ...payload });
    return data;
  },

  /**
   * Return (RECEIVE): tiga hasil master berbeda — AVAILABLE, ACCIDENTALLY_LOST,
   * EMPLOYEE_NEGLIGENCE. `asset_location` wajib (`AssetReturnRequest`, UIC 0.25).
   */
  async returnAsset(
    actor: AssetActor,
    id: string,
    payload: { assetStatus: ReturnStatus; assetLocation: string; note: string },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      requireWrite(actor);
      const row = findAsset(id);
      if (!canReturn(row)) throw new Error('422 — hanya aset yang sedang dipegang yang bisa dikembalikan.');
      const location = payload.assetLocation.trim();
      if (!location) throw new Error('422 VALIDATION_ERROR — lokasi aset saat diterima wajib diisi.');
      const holder = row.employeeInfo;
      Object.assign(row, {
        employeeId: null,
        employeeInfo: null,
        lastAssetStatus: payload.assetStatus,
        currentHandoverStatus: 'RECEIVE',
      });
      if (payload.assetStatus === 'AVAILABLE') settleAvailability(row);
      handovers.push({
        id: nextId('ho'),
        assetId: id,
        event: 'RECEIVE',
        employeeInfo: holder,
        isComplete: null,
        assetStatus: payload.assetStatus,
        assetLocation: location,
        note: payload.note.trim() || null,
        createdAt: now(),
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-handovers', { asset_id: id, event: 'RECEIVE', ...payload });
    return data;
  },

  /**
   * Transfer = SATU event `log_asset_transfer` antar-BRANCH (FSD 0.35 / UIC 0.25 —
   * `AssetLifecycleService.java:106-136`). Nol menyentuh `log_asset_handover` maupun pemegang;
   * narasi lama "RECEIVE lalu GIVING" tertukar dengan semantik Assign/Return dan sudah dicabut.
   * Wajib `transfer_reason`, `transfer_date`, dan foto.
   */
  async transfer(
    actor: AssetActor,
    id: string,
    payload: { toBranchId: string; transferReason: string; transferDate: string; photoAttached: boolean },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findAsset(id);
      if (!canTransfer(row)) throw new Error('422 — aset terminal tidak bisa dipindahkan.');
      if (!payload.toBranchId) throw new Error('422 VALIDATION_ERROR — branch tujuan wajib dipilih.');
      if (payload.toBranchId === row.branchId) throw new Error('422 — branch tujuan sama dengan branch asal.');
      if (!payload.transferReason.trim()) throw new Error('422 VALIDATION_ERROR — alasan transfer wajib diisi.');
      if (!payload.transferDate) throw new Error('422 VALIDATION_ERROR — tanggal transfer wajib diisi.');
      if (!payload.photoAttached) throw new Error('422 VALIDATION_ERROR — foto kondisi aset wajib dilampirkan.');
      transfers.push({
        id: nextId('tr'),
        assetId: id,
        fromBranchId: row.branchId,
        toBranchId: payload.toBranchId,
        transferReason: payload.transferReason.trim(),
        transferDate: payload.transferDate,
        createdAt: now(),
      });
      row.branchId = payload.toBranchId;
      settleAvailability(row);
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-transfers', { asset_id: id, ...payload });
    return data;
  },

  /** SCHEDULED menggeser `next_maintenance_date` sejauh interval kategori; UNSCHEDULED tidak. */
  async maintain(
    actor: AssetActor,
    id: string,
    payload: { maintenanceType: MaintenanceType; maintenanceDate: string; cost: string; note: string },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      requireWrite(actor);
      const row = findAsset(id);
      if (isTerminal(row.lastAssetStatus)) throw new Error('422 — aset terminal tidak bisa dirawat.');
      if (!payload.maintenanceDate) throw new Error('422 VALIDATION_ERROR — tanggal maintenance wajib diisi.');
      const cost = payload.cost.trim() ? parseAmount(payload.cost) : null;
      if (payload.cost.trim() && cost === null) throw new Error('422 VALIDATION_ERROR — biaya wajib angka.');
      maintenances.push({
        id: nextId('mt'),
        assetId: id,
        maintenanceType: payload.maintenanceType,
        maintenanceDate: payload.maintenanceDate,
        cost,
        note: payload.note.trim() || null,
        createdAt: now(),
      });
      if (payload.maintenanceType === 'SCHEDULED') {
        const interval = categories.find((item) => item.id === row.assetCategoryId)?.maintenanceIntervalDays ?? null;
        row.nextMaintenanceDate = nextMaintenanceDate(payload.maintenanceDate, interval);
      }
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-maintenances', { asset_id: id, ...payload });
    return data;
  },

  /**
   * Aksi Sewa — FLAT `POST /asset-leases`, hanya aset LEASED, vendor + foto wajib. Di sinilah
   * berkas kontrak sewa diisi (asimetri §7.3), tercatat append-only di `log_asset_lease`.
   */
  async lease(
    actor: AssetActor,
    id: string,
    payload: { vendorId: string; leaseContractNumber: string; photoAttached: boolean },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      requireWrite(actor);
      const row = findAsset(id);
      if (!canLease(row)) throw new Error('422 — aksi sewa hanya untuk aset sewaan yang masih aktif.');
      if (!payload.vendorId) throw new Error('422 VALIDATION_ERROR — vendor wajib dipilih.');
      if (!payload.leaseContractNumber.trim()) throw new Error('422 VALIDATION_ERROR — nomor kontrak wajib diisi.');
      if (!payload.photoAttached) throw new Error('422 VALIDATION_ERROR — foto kondisi aset wajib dilampirkan.');
      const file = `doc-lease-${row.assetCode.toLowerCase()}-${leases.length + 1}`;
      leases.push({
        id: nextId('ls'),
        assetId: id,
        vendorId: payload.vendorId,
        leaseContractNumber: payload.leaseContractNumber.trim(),
        leaseContractFile: file,
        createdAt: now(),
      });
      Object.assign(row, {
        vendorId: payload.vendorId,
        leaseContractNumber: payload.leaseContractNumber.trim(),
        currentLeaseContractFile: file,
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-leases', { asset_id: id, ...payload });
    return data;
  },

  /** FLAT `POST /asset-residuals` — nilai terkini + satu baris `log_asset_residual`. */
  async setResidual(actor: AssetActor, id: string, value: string): Promise<Asset> {
    if (MOCK) {
      await delay(200);
      requireWrite(actor);
      const row = findAsset(id);
      if (isTerminal(row.lastAssetStatus)) throw new Error('422 — aset terminal tidak lagi dinilai.');
      const amount = parseAmount(value);
      if (amount === null) throw new Error('422 VALIDATION_ERROR — nilai residu wajib angka tidak negatif.');
      residuals.push({ id: nextId('rs'), assetId: id, residualValue: amount, createdAt: now() });
      row.currentResidualValue = amount;
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-residuals', { asset_id: id, value });
    return data;
  },

  // ---------- Disposal ----------

  /**
   * Disposal hanya dari AVAILABLE. `asset_status` hanya SOLD|GRANTED — AUCTION ditolak 422
   * (regex `AssetDisposeRequest.java:18`; tetap nilai `last_asset_status` yang sah dibaca).
   * Nominal wajib untuk KEDUA jenis, berkas bukti dan foto wajib. Penerima karyawan vs pihak
   * luar = Mandatory-by-Value `is_employee`.
   */
  async dispose(actor: AssetActor, id: string, draft: DisposalDraft): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findAsset(id);
      if (!canDispose(row)) throw new Error('422 — hanya aset berstatus Tersedia yang bisa dilepas.');
      if (draft.assetStatus !== 'SOLD' && draft.assetStatus !== 'GRANTED') {
        throw new Error('422 VALIDATION_ERROR — jenis pelepasan hanya Dijual atau Dihibahkan.');
      }
      const nominal = parseAmount(draft.disposalNominal);
      if (nominal === null) throw new Error('422 VALIDATION_ERROR — nominal pelepasan wajib diisi.');
      if (!draft.disposalFileAttached)
        throw new Error('422 VALIDATION_ERROR — berkas bukti pelepasan wajib dilampirkan.');
      if (!draft.photoAttached) throw new Error('422 VALIDATION_ERROR — foto kondisi aset wajib dilampirkan.');
      let employeeInfo: PersonSnapshot | null = null;
      if (draft.isEmployee) {
        if (!draft.employeeId) throw new Error('422 VALIDATION_ERROR — karyawan penerima wajib dipilih.');
        employeeInfo = snapshotOf(draft.employeeId);
      } else {
        if (!draft.fullName.trim()) throw new Error('422 VALIDATION_ERROR — nama penerima wajib diisi.');
        if (!/^\d{16}$/.test(draft.idCardNumber.trim())) {
          throw new Error('422 VALIDATION_ERROR — nomor KTP penerima harus 16 digit.');
        }
        if (!draft.phone.trim()) throw new Error('422 VALIDATION_ERROR — telepon penerima wajib diisi.');
      }
      disposals.push({
        id: nextId('dp'),
        assetId: id,
        assetStatus: draft.assetStatus,
        disposalNominal: nominal,
        disposalFile: `doc-disposal-${row.assetCode.toLowerCase()}`,
        isEmployee: draft.isEmployee,
        employeeInfo,
        fullName: draft.isEmployee ? null : draft.fullName.trim(),
        idCardNumber: draft.isEmployee ? null : draft.idCardNumber.trim(),
        email: draft.isEmployee ? null : draft.email.trim() || null,
        phone: draft.isEmployee ? null : draft.phone.trim(),
        createdAt: now(),
      });
      row.lastAssetStatus = draft.assetStatus;
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-disposals', { asset_id: id, ...draft });
    return data;
  },

  async disposals(): Promise<(DisposalLog & { assetCode: string; assetName: string })[]> {
    if (MOCK) {
      await delay(150);
      return disposals
        .map((row) => {
          const asset = assets.find((item) => item.id === row.assetId);
          return { ...row, assetCode: asset?.assetCode ?? '—', assetName: asset?.assetName ?? '—' };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const { data } = await api.post<{ data: (DisposalLog & { assetCode: string; assetName: string })[] }>(
      '/asset-disposals/search',
      {},
    );
    return data.data;
  },
};
