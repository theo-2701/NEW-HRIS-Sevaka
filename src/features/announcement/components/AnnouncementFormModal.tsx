import { Form, Formik } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { htmlToText, textToHtml } from '@/features/announcement/content';
import { useCreateAnnouncement, useUpdateAnnouncement } from '@/features/announcement/hooks/useAnnouncement';
import { announcementSchema } from '@/features/announcement/validation';
import {
  CATEGORY_OPTIONS,
  RECIPIENT_ROLE_OPTIONS,
  type AnnouncementCategory,
  type AnnouncementDetail,
} from '@/features/announcement/types';

/** Radix Select menolak nilai kosong — "belum ditentukan" diwakili sentinel lalu dipetakan ke null. */
const NO_RECIPIENT = 'NONE';

interface FormValues {
  title: string;
  category: AnnouncementCategory | '';
  recipientRole: string;
  content: string;
}

/** Susun Rancangan (A3) / Sunting Rancangan (B3) — hanya untuk status DRAFT. */
export function AnnouncementFormModal({
  open,
  editing,
  onClose,
  onCreated,
}: {
  open: boolean;
  editing: AnnouncementDetail | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const pending = create.isPending || update.isPending;

  const initialValues: FormValues = editing
    ? {
        title: editing.title,
        category: editing.category,
        recipientRole: editing.recipientRole ?? NO_RECIPIENT,
        content: htmlToText(editing.content),
      }
    : { title: '', category: '', recipientRole: NO_RECIPIENT, content: '' };

  const submit = (values: FormValues) => {
    const draft = {
      title: values.title.trim(),
      category: values.category,
      recipientRole: values.recipientRole === NO_RECIPIENT ? '' : values.recipientRole,
      content: textToHtml(values.content),
    };
    if (editing) {
      update.mutate({ id: editing.id, patch: draft }, { onSuccess: onClose });
    } else {
      create.mutate(draft, { onSuccess: (created) => onCreated(created.id) });
    }
  };

  return (
    <Formik<FormValues>
      initialValues={initialValues}
      validationSchema={announcementSchema}
      enableReinitialize
      onSubmit={submit}
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title={editing ? 'Edit draft announcement' : 'New announcement'}
          description="Disimpan sebagai rancangan. Peran penerima boleh dikosongkan dulu, tetapi wajib diisi sebelum terbit."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={pending}>
                {pending ? 'Menyimpan…' : 'Save as draft'}
              </Button>
            </>
          }
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <TextField name="title" label="Judul" required maxLength={200} containerClassName="md:col-span-2" />
            <SelectField
              name="category"
              label="Kategori"
              required
              placeholder="Pilih kategori"
              options={CATEGORY_OPTIONS}
            />
            <SelectField
              name="recipientRole"
              label="Peran penerima"
              options={[{ value: NO_RECIPIENT, label: 'Belum ditentukan' }, ...RECIPIENT_ROLE_OPTIONS]}
              hint="Seluruh karyawan = peran Employee."
            />
            <TextAreaField
              name="content"
              label="Isi pengumuman"
              required
              rows={8}
              hint="Pisahkan paragraf dengan satu baris kosong."
              containerClassName="md:col-span-2"
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
