import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile.service';
import { toast } from '@/store/ui.store';
import type { PersonalProfile, ProfileActor, Relative, Training, WorkExperience } from '@/features/profile/types';

export const profileKeys = {
  me: ['profile', 'me'] as const,
  of: (employeeId: string) => ['profile', 'of', employeeId] as const,
};

/**
 * Tanpa `employeeId` = profil pemanggil (`/me/*`, jalur ESS). Dengan `employeeId` = profil
 * karyawan lain, dibuka HR dari halaman Employee Detail — service sudah menerima id sejak awal
 * (`/employee-profiles/{employeeId}`), tetapi dataset dummy hanya punya satu orang sehingga
 * isinya sama; pembedanya baru nyata saat backend tersambung.
 */
export function useProfile(employeeId?: string) {
  return useQuery({
    queryKey: employeeId ? profileKeys.of(employeeId) : profileKeys.me,
    queryFn: () => (employeeId ? profileService.get(employeeId) : profileService.get()),
  });
}

/** Semua mutasi profil memakai invalidasi yang sama + toast seragam. */
function useProfileMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<void>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast(successMessage, 'ok');
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Aktor ikut dikirim: field HR-restricted yang diubah ESS ditolak 403 oleh server. */
export const useUpdateProfile = (actor: ProfileActor = 'ESS') =>
  useProfileMutation<Partial<PersonalProfile>>(
    (patch) => profileService.updateProfile(patch, actor),
    'Perubahan biodata tersimpan.',
  );

export const useSaveRelative = () =>
  useProfileMutation<Relative>((relative) => profileService.saveRelative(relative), 'Data keluarga tersimpan.');

export const useDeleteRelative = () =>
  useProfileMutation<string>((id) => profileService.deleteRelative(id), 'Data keluarga dihapus.');

export const useSaveTraining = () =>
  useProfileMutation<Training>((training) => profileService.saveTraining(training), 'Data pelatihan tersimpan.');

export const useDeleteTraining = () =>
  useProfileMutation<string>((id) => profileService.deleteTraining(id), 'Data pelatihan dihapus.');

export const useSaveWork = () =>
  useProfileMutation<WorkExperience>((work) => profileService.saveWork(work), 'Riwayat pekerjaan tersimpan.');

export const useDeleteWork = () =>
  useProfileMutation<string>((id) => profileService.deleteWork(id), 'Riwayat pekerjaan dihapus.');

/** Reveal PII penuh — satu baris read-audit per panggilan (UIC-PROFILE §2.6). */
export function useRevealProfile() {
  return useMutation({
    mutationFn: () => profileService.reveal(),
    onSuccess: () => toast('Nilai sensitif ditampilkan — satu baris read-audit ditulis (UIC-PROFILE §2.6).', 'warn'),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
