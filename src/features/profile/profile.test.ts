import { describe, expect, it } from 'vitest';
import { profileService } from '@/features/profile/services/profile.service';
import {
  basicInfoSchema,
  relativeSchema,
  trainingSchema,
  workExperienceSchema,
} from '@/features/profile/validation';

const baseProfile = {
  nationality: 'CITIZEN',
  maritalStatus: 'SINGLE',
  npwp: '',
  npwpName: '',
  passportNumber: '',
  motherMaidenName: '',
  dateOfBirth: '1990-05-12',
  placeOfBirth: 'Bandung',
  gender: 'MALE',
  lastEducation: 'BACHELOR',
  bloodType: 'O',
  religion: 'ISLAM',
  homeOwnershipStatus: 'OWNED',
  disabilityStatus: 'NONE',
  idCardAddress: 'Jl. Merdeka No. 1',
  isDomicileSameAsIdCard: true,
  domicileAddress: 'Jl. Merdeka No. 1',
  personalPhone: '081234567890',
  personalEmail: 'budi@mail.com',
  otherNik: '',
};

describe('basic info — aturan bersyarat kontrak', () => {
  it('paspor opsional untuk WNI', async () => {
    await expect(basicInfoSchema.validate(baseProfile)).resolves.toBeTruthy();
  });

  it('paspor wajib saat kewarganegaraan Foreigner (MbV)', async () => {
    await expect(
      basicInfoSchema.validate({ ...baseProfile, nationality: 'FOREIGNER' }),
    ).rejects.toThrow(/Paspor wajib/);
  });

  it('alamat domisili wajib saat berbeda dari KTP', async () => {
    await expect(
      basicInfoSchema.validate({ ...baseProfile, isDomicileSameAsIdCard: false, domicileAddress: '' }),
    ).rejects.toThrow(/domisili wajib/);
  });

  it('menolak email pribadi yang tidak valid', async () => {
    await expect(basicInfoSchema.validate({ ...baseProfile, personalEmail: 'bukan-email' })).rejects.toThrow(
      /Format email/,
    );
  });
});

describe('relative — field minimum', () => {
  it('butuh nama, hubungan, dan telepon', async () => {
    await expect(
      relativeSchema.validate({ name: '', relationshipType: '', phoneNumber: '' }),
    ).rejects.toThrow();
  });

  it('menerima data lengkap minimum', async () => {
    await expect(
      relativeSchema.validate({ name: 'Ani', relationshipType: 'SPOUSE', phoneNumber: '0812' }),
    ).resolves.toBeTruthy();
  });
});

describe('training & pengalaman kerja — urutan periode', () => {
  it('menolak tahun selesai sebelum tahun mulai', async () => {
    await expect(
      trainingSchema.validate({
        trainingName: 'K3',
        trainingCategory: 'COMPLIANCE',
        startYear: '2024',
        endYear: '2023',
      }),
    ).rejects.toThrow(/mendahului/);
  });

  it('menolak tanggal keluar sebelum tanggal masuk', async () => {
    await expect(
      workExperienceSchema.validate({
        companyName: 'PT A',
        position: 'Staff',
        joinDate: '2020-05',
        leaveDate: '2019-01',
      }),
    ).rejects.toThrow(/mendahului/);
  });
});

describe('server profile — gerbang UIC-PROFILE-0.2', () => {
  it('ESS mengubah field HR-restricted ditolak 403, HR boleh', async () => {
    const { profile } = await profileService.get();
    const other = profile.maritalStatus === 'MARRIED' ? 'SINGLE' : 'MARRIED';
    await expect(profileService.updateProfile({ maritalStatus: other }, 'ESS')).rejects.toThrow(/403/);
    await expect(profileService.updateProfile({ maritalStatus: other }, 'HR')).resolves.toBeUndefined();
  });

  it('FOREIGNER tanpa paspor ditolak 422 (MbV)', async () => {
    await expect(
      profileService.updateProfile({ nationality: 'FOREIGNER', passportNumber: '' }, 'HR'),
    ).rejects.toThrow(/422/);
  });

  it('pengalaman kerja wajib presisi bulan-tahun dan leave ≥ join', async () => {
    const work = {
      id: '',
      companyName: 'PT Uji',
      position: 'Staff',
      joinDate: '2020-05-15',
      leaveDate: '2021-01-01',
      jobDescription: '',
      employmentCertificate: '',
    };
    await expect(profileService.saveWork(work)).rejects.toThrow(/hari = 01/);
    await expect(profileService.saveWork({ ...work, joinDate: '2022-01-01' })).rejects.toThrow(/mendahului/);
  });

  it('relative tanpa nomor telepon valid ditolak 422', async () => {
    await expect(
      profileService.saveRelative({
        id: '',
        name: 'Ani',
        relationshipType: 'SPOUSE',
        phoneNumber: '12',
        email: '',
        dateOfBirth: '',
        jobId: '',
        address: '',
        isEmergencyContact: false,
      }),
    ).rejects.toThrow(/422/);
  });
});
