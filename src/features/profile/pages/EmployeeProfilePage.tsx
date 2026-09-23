import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '@/components/PageShell';
import { IdentityCard, ProfileFrame } from '@/features/profile/components/ProfileBits';
import { BasicInfoSection } from '@/features/profile/sections/BasicInfoSection';
import { EmergencyContactSection, FamilySection } from '@/features/profile/sections/FamilySection';
import { FormalEducationSection, TrainingSection } from '@/features/profile/sections/EducationSections';
import {
  AdditionalInfoSection,
  WorkExperienceSection,
} from '@/features/profile/sections/WorkAndAdditionalSections';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { NATIONALITY_OPTIONS, labelOf } from '@/features/profile/types';
import type { ProfileActor } from '@/features/profile/types';
import { useAuthStore } from '@/store/auth.store';

/** Tujuh menu ESS di bawah Employee Profile › General. */
type Section =
  | 'basic-info'
  | 'family'
  | 'emergency-contact'
  | 'formal-education'
  | 'informal-education'
  | 'working-experience'
  | 'additional-info';

const SECTION_BY_PATH: Record<string, Section> = {
  '/me/profile': 'basic-info',
  '/me/profile/family': 'family',
  '/me/profile/emergency-contact': 'emergency-contact',
  '/me/profile/formal-education': 'formal-education',
  '/me/profile/informal-education': 'informal-education',
  '/me/profile/working-experience': 'working-experience',
  '/me/profile/additional-info': 'additional-info',
};

/** Rantai breadcrumb: Employee Profile / General / <grup> / <menu>. */
const CRUMB_BY_SECTION: Record<Section, [string, string]> = {
  'basic-info': ['Personal', 'Basic Info'],
  family: ['Personal', 'Family'],
  'emergency-contact': ['Personal', 'Emergency Contact'],
  'formal-education': ['Education & Experience', 'Formal Education'],
  'informal-education': ['Education & Experience', 'Informal Education'],
  'working-experience': ['Education & Experience', 'Working Experience'],
  'additional-info': ['Additional Info', ''],
};

/**
 * Employee Profile (ESS) — port `_prototype/employee-profile.html`.
 *
 * Layout mengikuti prototype: SATU frame putih berisi breadcrumb → kartu
 * identitas (+ pemilih cakupan aktor) → isi seksi. Tujuh menu dipetakan ke
 * tujuh route; sidebar yang jadi navigasinya, tanpa tab tambahan di halaman.
 */
export function EmployeeProfilePage() {
  const { pathname } = useLocation();
  const section = SECTION_BY_PATH[pathname] ?? 'basic-info';
  const [group, leaf] = CRUMB_BY_SECTION[section];
  const [params] = useSearchParams();
  /* Dibuka HR dari Employee Detail: ?employee=<id>&as=HR — tanpa keduanya tetap jalur ESS. */
  const employeeId = params.get('employee') ?? undefined;
  const { data, isLoading } = useProfile(employeeId);
  const user = useAuthStore((s) => s.user);
  const [actor, setActor] = useState<ProfileActor>(params.get('as') === 'HR' ? 'HR' : 'ESS');

  const crumbs = [
    { label: 'Employee Profile' },
    { label: 'General' },
    { label: group },
    ...(leaf ? [{ label: leaf }] : []),
  ];

  return (
    <ProfileFrame>
      <Breadcrumbs items={crumbs} />

      {employeeId && (
        <p className="m-0 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium text-secondary-900">
          Dibuka dari Employee Detail untuk karyawan {employeeId} — dataset dummy hanya memuat satu profil, jadi isinya
          masih profil contoh yang sama; pembedanya berlaku begitu backend tersambung.
        </p>
      )}

      {isLoading || !data ? (
        <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat profil…</p>
      ) : (
        <>
          <IdentityCard
            name={user?.name ?? 'Budi Santoso'}
            role={user?.position ?? 'Backend Engineer · Engineering'}
            nik="NIK-0101"
            nationality={labelOf(NATIONALITY_OPTIONS, data.profile.nationality)}
            status="Active Employee"
            actor={actor}
            onActorChange={setActor}
          />

          <div className="flex flex-col gap-4">
            {section === 'basic-info' && <BasicInfoSection profile={data.profile} actor={actor} />}
            {section === 'family' && <FamilySection relatives={data.relatives} />}
            {section === 'emergency-contact' && <EmergencyContactSection relatives={data.relatives} />}
            {section === 'formal-education' && <FormalEducationSection lastEducation={data.profile.lastEducation} />}
            {section === 'informal-education' && <TrainingSection trainings={data.trainings} />}
            {section === 'working-experience' && <WorkExperienceSection works={data.works} />}
            {section === 'additional-info' && <AdditionalInfoSection profile={data.profile} />}
          </div>
        </>
      )}
    </ProfileFrame>
  );
}
