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
  isTerminal,
  nextMaintenanceDate,
  parseAmount,
} from '@/features/assets/rules';
import type {
  Asset,
  AssetCategory,
  AssetDraft,
  AssetStatus,
  DisposalDraft,
  DisposalLog,
  HandoverLog,
  MaintenanceLog,
  MaintenanceType,
  PersonSnapshot,
  ReturnStatus,
  TransferLog,
} from '@/features/assets/types';

/**
 * API service Assets (UIC-001-COMPANY-0.22 §3.2). Registri, kategori, aksi lifecycle (Assign,
 * Return, Transfer, Maintenance, Lease, Residual), dan Disposal. Setiap aksi menulis log
 * append-only dan memperbarui state master dalam satu transaksi.
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

let categories: AssetCategory[] = [];
let assets: Asset[] = [];
let handovers: HandoverLog[] = [];
let maintenances: MaintenanceLog[] = [];
let transfers: TransferLog[] = [];
let disposals: DisposalLog[] = [];
let sequence = 0;

export function resetAssetMocks() {
  categories = CATEGORY_SEED.map((row) => ({ ...row }));
  assets = ASSET_SEED.map((row) => ({ ...row, employeeInfo: row.employeeInfo ? { ...row.employeeInfo } : null }));
  handovers = HANDOVER_SEED.map((row) => ({ ...row }));
  maintenances = MAINTENANCE_SEED.map((row) => ({ ...row }));
  transfers = TRANSFER_SEED.map((row) => ({ ...row }));
  disposals = [];
  sequence = 0;
}
resetAssetMocks();

const nextId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;

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

/** Status setelah registrasi atau setelah blocker berubah: NOT_AVAILABLE bila ada blocker. */
function settleAvailability(row: Asset) {
  if (row.lastAssetStatus !== 'AVAILABLE' && row.lastAssetStatus !== 'NOT_AVAILABLE') return;
  row.lastAssetStatus = blockerReasons(row).length ? 'NOT_AVAILABLE' : 'AVAILABLE';
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

  async saveCategory(draft: { name: string; maintenanceIntervalDays: string }, id?: string): Promise<AssetCategory> {
    if (MOCK) {
      await delay(220);
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

  async deleteCategory(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
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
          (row) =>
            !query || row.assetName.toLowerCase().includes(query) || row.assetCode.toLowerCase().includes(query),
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
   * (422 Mandatory-by-Value). Berkas kontrak sewa sengaja tidak diterima di sini (asimetri §7.3).
   */
  async register(draft: AssetDraft): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      const code = draft.assetCode.trim().toUpperCase();
      const name = draft.assetName.trim();
      if (!code) throw new Error('422 VALIDATION_ERROR — kode aset wajib diisi.');
      if (!name) throw new Error('422 VALIDATION_ERROR — nama aset wajib diisi.');
      if (assets.some((row) => row.assetCode === code)) {
        throw new Error(`409 — kode aset ${code} sudah dipakai aset aktif lain.`);
      }

      const owned = draft.ownershipType === 'OWNED';
      let purchasePrice: number | null = null;
      let leaseAmount: number | null = null;
      if (owned) {
        purchasePrice = parseAmount(draft.purchasePrice);
        if (purchasePrice === null) throw new Error('422 VALIDATION_ERROR — harga beli wajib untuk aset milik sendiri.');
        if (!draft.purchaseInvoiceNumber.trim()) {
          throw new Error('422 VALIDATION_ERROR — nomor faktur wajib untuk aset milik sendiri.');
        }
        if (!draft.purchaseDate) throw new Error('422 VALIDATION_ERROR — tanggal beli wajib untuk aset milik sendiri.');
      } else {
        leaseAmount = parseAmount(draft.leaseAmount);
        if (leaseAmount === null) throw new Error('422 VALIDATION_ERROR — nilai sewa wajib untuk aset sewaan.');
        if (!draft.leaseStartDate || !draft.leaseEndDate) {
          throw new Error('422 VALIDATION_ERROR — tanggal mulai dan akhir sewa wajib diisi.');
        }
        if (draft.leaseEndDate < draft.leaseStartDate) {
          throw new Error('422 VALIDATION_ERROR — akhir sewa tidak boleh sebelum mulai sewa.');
        }
        if (!draft.leaseContractNumber.trim()) throw new Error('422 VALIDATION_ERROR — nomor kontrak sewa wajib diisi.');
        if (!draft.vendorId) throw new Error('422 VALIDATION_ERROR — vendor wajib untuk aset sewaan.');
      }

      const row: Asset = {
        id: nextId('as'),
        assetCode: code,
        assetName: name,
        serialNumber: draft.serialNumber.trim() || null,
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
  async uploadPhoto(id: string): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      const row = findAsset(id);
      if (isTerminal(row.lastAssetStatus)) throw new Error('422 — aset terminal tidak menerima berkas baru.');
      row.photo1 = `doc-photo-${row.assetCode.toLowerCase()}`;
      settleAvailability(row);
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/files`, { field: 'photo1' });
    return data;
  },

  // ---------- Riwayat ----------

  async history(id: string): Promise<{
    handovers: HandoverLog[];
    maintenances: MaintenanceLog[];
    transfers: TransferLog[];
    disposals: DisposalLog[];
  }> {
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
        disposals: byAsset(disposals),
      };
    }
    const { data } = await api.get<{
      handovers: HandoverLog[];
      maintenances: MaintenanceLog[];
      transfers: TransferLog[];
      disposals: DisposalLog[];
    }>(`/assets/${id}/histories`);
    return data;
  },

  // ---------- Lifecycle ----------

  /** Assign (GIVING): `is_complete` true → ASSIGNED, false → INCOMPLETE (tetap dipegang). */
  async assign(id: string, payload: { employeeId: string; isComplete: boolean; note: string }): Promise<Asset> {
    if (MOCK) {
      await delay(250);
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
        note: payload.note.trim() || null,
        createdAt: now(),
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/assign`, payload);
    return data;
  },

  /** Return (RECEIVE): tiga hasil master berbeda — AVAILABLE, ACCIDENTALLY_LOST, EMPLOYEE_NEGLIGENCE. */
  async returnAsset(id: string, payload: { assetStatus: ReturnStatus; note: string }): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      const row = findAsset(id);
      if (!canReturn(row)) throw new Error('422 — hanya aset yang sedang dipegang yang bisa dikembalikan.');
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
        note: payload.note.trim() || null,
        createdAt: now(),
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/return`, payload);
    return data;
  },

  /**
   * Transfer = DUA event (§8.3): RECEIVE dari pemegang lama lalu GIVING ke pemegang baru, bukan
   * satu langkah. Pindah branch memperbarui `branch_id`.
   */
  async transfer(id: string, payload: { toBranchId: string; toEmployeeId: string }): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      const row = findAsset(id);
      if (!canReturn(row)) throw new Error('422 — hanya aset yang sedang dipegang yang bisa dipindahkan.');
      if (!payload.toBranchId) throw new Error('422 VALIDATION_ERROR — branch tujuan wajib dipilih.');
      const from = row.employeeInfo;
      const to = snapshotOf(payload.toEmployeeId);
      if (from?.employeeId === to.employeeId && row.branchId === payload.toBranchId) {
        throw new Error('422 — tujuan transfer sama dengan asal.');
      }
      const stamp = now();
      handovers.push({
        id: nextId('ho'),
        assetId: id,
        event: 'RECEIVE',
        employeeInfo: from,
        isComplete: null,
        assetStatus: 'AVAILABLE',
        note: 'Transfer — diterima dari pemegang lama.',
        createdAt: stamp,
      });
      handovers.push({
        id: nextId('ho'),
        assetId: id,
        event: 'GIVING',
        employeeInfo: to,
        isComplete: row.lastAssetStatus === 'ASSIGNED',
        assetStatus: null,
        note: 'Transfer — diserahkan ke pemegang baru.',
        createdAt: stamp,
      });
      transfers.push({
        id: nextId('tr'),
        assetId: id,
        fromBranchId: row.branchId,
        toBranchId: payload.toBranchId,
        fromEmployeeInfo: from,
        toEmployeeInfo: to,
        createdAt: stamp,
      });
      Object.assign(row, {
        branchId: payload.toBranchId,
        employeeId: to.employeeId,
        employeeInfo: to,
        currentHandoverStatus: 'GIVING',
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/transfer`, payload);
    return data;
  },

  /** SCHEDULED menggeser `next_maintenance_date` sejauh interval kategori; UNSCHEDULED tidak. */
  async maintain(
    id: string,
    payload: { maintenanceType: MaintenanceType; maintenanceDate: string; cost: string; note: string },
  ): Promise<Asset> {
    if (MOCK) {
      await delay(250);
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
    const { data } = await api.post<Asset>(`/assets/${id}/maintenances`, payload);
    return data;
  },

  /** Aksi Sewa — hanya aset LEASED, vendor wajib; di sinilah berkas kontrak sewa diisi (§7.3). */
  async lease(id: string, payload: { vendorId: string; leaseContractNumber: string }): Promise<Asset> {
    if (MOCK) {
      await delay(250);
      const row = findAsset(id);
      if (!canLease(row)) throw new Error('422 — aksi sewa hanya untuk aset sewaan yang masih aktif.');
      if (!payload.vendorId) throw new Error('422 VALIDATION_ERROR — vendor wajib dipilih.');
      if (!payload.leaseContractNumber.trim()) throw new Error('422 VALIDATION_ERROR — nomor kontrak wajib diisi.');
      Object.assign(row, {
        vendorId: payload.vendorId,
        leaseContractNumber: payload.leaseContractNumber.trim(),
        currentLeaseContractFile: `doc-lease-${row.assetCode.toLowerCase()}`,
      });
      return { ...row };
    }
    const { data } = await api.post<Asset>('/asset-leases', { asset_id: id, ...payload });
    return data;
  },

  async setResidual(id: string, value: string): Promise<Asset> {
    if (MOCK) {
      await delay(200);
      const row = findAsset(id);
      const amount = parseAmount(value);
      if (amount === null) throw new Error('422 VALIDATION_ERROR — nilai residu wajib angka tidak negatif.');
      row.currentResidualValue = amount;
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/residuals`, { value });
    return data;
  },

  // ---------- Disposal ----------

  /**
   * Disposal hanya dari AVAILABLE. Nominal wajib bila SOLD. Penerima employee vs pihak luar
   * adalah Mandatory-by-Value `is_employee` — dua sub-form dengan field wajib berbeda. SOLD dan
   * GRANTED terminal; AUCTION boleh kembali AVAILABLE.
   */
  async dispose(id: string, draft: DisposalDraft): Promise<Asset> {
    if (MOCK) {
      await delay(300);
      const row = findAsset(id);
      if (!canDispose(row)) throw new Error('422 — hanya aset berstatus Tersedia yang bisa dilepas.');
      const nominal = draft.disposalNominal.trim() ? parseAmount(draft.disposalNominal) : null;
      if (draft.disposalType === 'SOLD' && nominal === null) {
        throw new Error('422 VALIDATION_ERROR — nominal wajib bila aset dijual.');
      }
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
        disposalType: draft.disposalType,
        disposalNominal: nominal,
        isEmployee: draft.isEmployee,
        employeeInfo,
        fullName: draft.isEmployee ? null : draft.fullName.trim(),
        idCardNumber: draft.isEmployee ? null : draft.idCardNumber.trim(),
        email: draft.isEmployee ? null : draft.email.trim() || null,
        phone: draft.isEmployee ? null : draft.phone.trim(),
        createdAt: now(),
      });
      row.lastAssetStatus = draft.disposalType;
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/dispose`, draft);
    return data;
  },

  /** Lelang yang batal: AUCTION kembali AVAILABLE (satu-satunya jenis pelepasan yang reversibel). */
  async cancelAuction(id: string): Promise<Asset> {
    if (MOCK) {
      await delay(200);
      const row = findAsset(id);
      if (row.lastAssetStatus !== 'AUCTION') throw new Error('422 — hanya aset yang sedang dilelang yang bisa dibatalkan.');
      row.lastAssetStatus = 'AVAILABLE';
      settleAvailability(row);
      return { ...row };
    }
    const { data } = await api.post<Asset>(`/assets/${id}/cancel-auction`, {});
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

export { today as assetToday };
