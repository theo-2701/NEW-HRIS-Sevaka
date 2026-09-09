import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/features/profile/services/profile.service';
import { toast } from '@/store/ui.store';
import type { PersonalProfile, Relative, Training, WorkExperience } from '@/features/profile/types';

export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export function useProfile() {
  return useQuery({ queryKey: profileKeys.me, queryFn: () => profileService.get() });
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

export const useUpdateProfile = () =>
  useProfileMutation<Partial<PersonalProfile>>(
    (patch) => profileService.updateProfile(patch),
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
