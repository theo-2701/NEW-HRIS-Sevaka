import type { ReactNode } from 'react';
import { FieldArray, getIn, useField, useFormikContext } from 'formik';
import { Check, Lock } from 'lucide-react';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { MultiSelect } from '@/components/MultiSelect';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CHOICE_TYPES, FIXED_STAGES, LIMITS, OPTIONS, PLATFORMS, STEPS, TEAM_POOL, TEAM_ROLES, emptyQuestion, newId } from '@/features/recruitment/jobForm';
import type { JobDetails } from '@/features/recruitment/types';
import { cn } from '@/lib/utils';

/** `.cj-steps` — lingkaran bernomor + garis penghubung; langkah yang sudah lewat bisa diklik. */
export function Stepper({ current, onPick }: { current: number; onPick: (step: number) => void }) {
  return (
    <ol className="m-0 flex list-none items-center gap-3 p-0">
      {STEPS.map((item, i) => {
        const step = i + 1;
        const done = step < current;
        return (
          <li key={item.title} className="flex flex-1 items-center gap-3 last:flex-none">
            <button
              type="button"
              disabled={!done}
              onClick={() => onPick(step)}
              aria-current={step === current ? 'step' : undefined}
              className="flex items-center gap-2.5 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full font-body text-[13px] font-bold',
                  step === current && 'bg-secondary-500 text-white',
                  done && 'bg-success-100 text-success-900',
                  step > current && 'border border-border-2 bg-white text-fg-3',
                )}
              >
                {done ? <Check className="size-4" /> : step}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={cn('font-body text-xs font-semibold', step === current ? 'text-secondary-600' : 'text-fg-3')}>Step {step}</span>
                <span className={cn('whitespace-nowrap font-body text-[13px] font-bold', step > current ? 'text-fg-3' : 'text-fg-1')}>{item.title}</span>
              </span>
            </button>
            {step < STEPS.length && <span className={cn('h-px min-w-6 flex-1', done ? 'bg-secondary-500' : 'bg-border-2')} />}
          </li>
        );
      })}
    </ol>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-1 pt-6 first:border-t-0 first:pt-0">
      <header>
        <h2 className="m-0 font-display text-base font-bold text-fg-1">{title}</h2>
        {sub && <p className="m-0 mt-1 font-body text-[13px] font-medium text-fg-3">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

/** Checkbox satu baris (`.cj-inline-check`) — CheckboxField rumah berbentuk kotak atestasi, terlalu berat di sini. */
function InlineCheck({ name, children, disabled }: { name: string; children: ReactNode; disabled?: boolean }) {
  const [field, , helpers] = useField<boolean>(name);
  return (
    <label className={cn('flex items-center gap-2 font-body text-[13px] font-medium text-fg-2', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
      <Checkbox checked={Boolean(field.value)} disabled={disabled} onCheckedChange={(next) => void helpers.setValue(next === true)} />
      {children}
    </label>
  );
}

const counted = (values: JobDetails, name: keyof JobDetails, max: number, help?: string) => {
  const count = `${String(values[name] ?? '').length}/${max}`;
  return help ? `${help} ${count}` : count;
};

const grid = 'grid gap-x-6 gap-y-4 md:grid-cols-2';

export function JobDetailsStep() {
  const { values } = useFormikContext<JobDetails>();
  return (
    <div className="flex flex-col gap-6">
      <Section title="General information" sub="Basic details about the job, including position, location, and headcount.">
        <div className={grid}>
          <SelectField name="position" label="Job position" required placeholder="Select job position" options={OPTIONS.position} />
          <TextField name="title" label="Job listing title" maxLength={LIMITS.title} placeholder="Input job listing title here" hint={counted(values, 'title', LIMITS.title, 'Leave empty to use the job position.')} />
          <SelectField name="branch" label="Branch location" required placeholder="Select branch location" options={OPTIONS.branch} />
          <SelectField name="province" label="Province" required placeholder="Select province" options={OPTIONS.province} />
          <SelectField name="city" label="City" required placeholder="Select city" options={OPTIONS.city} />
          <SelectField name="organization" label="Organization" required placeholder="Select organization" options={OPTIONS.organization} />
          <SelectField name="employmentStatus" label="Employment type" required placeholder="Select employment type" options={OPTIONS.employmentStatus} />
          <SelectField name="workplaceType" label="Workplace type" placeholder="Select workplace type" options={OPTIONS.workplaceType} />
          <div className="flex flex-col gap-2">
            <TextField name="headcount" type="number" min={1} label="Headcount needed" />
            <InlineCheck name="showHeadcount">Show headcount needed to public</InlineCheck>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <TextField name="salaryMin" type="number" min={0} label="Salary range (IDR)" required placeholder="Lowest" />
              <TextField name="salaryMax" type="number" min={0} label="Up to" placeholder="Highest" />
            </div>
            <InlineCheck name="showSalary">Show salary range to public</InlineCheck>
          </div>
          <TextAreaField
            name="salaryDescription"
            label="Salary description"
            required
            rows={2}
            maxLength={LIMITS.salaryDescription}
            placeholder="Input salary description here"
            hint={counted(values, 'salaryDescription', LIMITS.salaryDescription)}
            containerClassName="md:col-span-2"
          />
        </div>
      </Section>

      {/* ponytail: editor teks kaya (bold/list) dari prototype diganti textarea — tambah editor bila kandidat perlu format. */}
      <Section title="Job information" sub="The duties, responsibilities and qualifications of the position.">
        <TextAreaField name="description" label="Job description" required rows={5} maxLength={LIMITS.rich} placeholder="Describe the role, day-to-day duties, and what success looks like." hint={counted(values, 'description', LIMITS.rich, `At least ${LIMITS.description} characters.`)} />
        <TextAreaField name="requirements" label="Job requirements" required rows={5} maxLength={LIMITS.rich} placeholder="List the skills, experience, and qualifications you expect." hint={counted(values, 'requirements', LIMITS.rich, `At least ${LIMITS.requirements} characters.`)} />
        <TextAreaField name="benefits" label="Benefits" required rows={4} maxLength={LIMITS.rich} placeholder="Describe the perks and benefits offered with this role." hint={counted(values, 'benefits', LIMITS.rich, `At least ${LIMITS.benefits} characters.`)} />
        <TextAreaField name="summary" label="Job summary" required rows={2} maxLength={LIMITS.summary} placeholder="A one-line summary shown on the job card" hint={counted(values, 'summary', LIMITS.summary)} />
      </Section>

      <Section title="Experience & qualifications" sub="Education, experience level and other requirements for the job.">
        <div className={grid}>
          <SelectField name="education" label="Education" placeholder="Select education level" options={OPTIONS.education} />
          <SelectField name="experienceLevel" label="Experience level" placeholder="Select experience level" options={OPTIONS.experienceLevel} />
          <TextField name="minExperience" type="number" min={0} label="Min. experience (years)" required placeholder="0" />
          <SelectField name="gender" label="Gender" options={OPTIONS.gender} />
          <div className="grid grid-cols-2 gap-3">
            <TextField name="ageMin" type="number" min={0} label="Age range (years)" required />
            <TextField name="ageMax" type="number" min={0} label="Up to" />
          </div>
        </div>
      </Section>
    </div>
  );
}

export function ApplicationFormStep() {
  const { values } = useFormikContext<JobDetails>();
  const groups = [...new Set(values.formFields.map((item) => item.group))];
  return (
    <div className="flex flex-col gap-6">
      <Section title="Application form" sub="Choose which fields candidates fill in, and which of them are mandatory. Locked fields are always asked.">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-secondary-600">{group}</span>
            {values.formFields.map((item, i) =>
              item.group !== group ? null : (
                <div key={item.name} className={cn('flex flex-col gap-2', !item.on && 'opacity-60')}>
                  <ToggleField
                    name={`formFields.${i}.on`}
                    disabled={item.locked}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        {item.name}
                        {item.locked && <Lock className="size-3.5 text-fg-4" aria-label="Always asked" />}
                      </span>
                    }
                    hint={item.type}
                  />
                  {item.on && (
                    <span className="pl-3.5">
                      <InlineCheck name={`formFields.${i}.mandatory`} disabled={item.locked}>
                        Mandatory
                      </InlineCheck>
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
        ))}
      </Section>

      <Section title="Custom questions" sub="Ask for anything the standard form does not cover.">
        <FieldArray name="questions">
          {(helpers) => (
            <>
              {values.questions.map((question, i) => (
                <div key={question.id} className="flex flex-col gap-3 rounded-xl border border-border-1 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-end">
                    <TextField name={`questions.${i}.question`} label={`Question ${i + 1}`} placeholder="Question" />
                    <SelectField name={`questions.${i}.type`} label="Answer type" options={OPTIONS.questionType} />
                    <RemoveRowButton aria-label={`Remove question ${i + 1}`} onClick={() => helpers.remove(i)} />
                  </div>
                  <TextAreaField name={`questions.${i}.description`} rows={2} placeholder="Description (optional)" />
                  {CHOICE_TYPES.includes(question.type) && (
                    <FieldArray name={`questions.${i}.options`}>
                      {(options) => (
                        <div className="flex flex-col gap-2">
                          {question.options.map((_, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <TextField name={`questions.${i}.options.${j}`} placeholder={`Option ${j + 1}`} containerClassName="flex-1" />
                              <RemoveRowButton aria-label={`Remove option ${j + 1}`} onClick={() => options.remove(j)} />
                            </div>
                          ))}
                          <div>
                            <AddButton onClick={() => options.push('')}>Add Option</AddButton>
                          </div>
                        </div>
                      )}
                    </FieldArray>
                  )}
                  <InlineCheck name={`questions.${i}.required`}>Required</InlineCheck>
                </div>
              ))}
              <div>
                <AddButton onClick={() => helpers.push(emptyQuestion())}>Add Question</AddButton>
              </div>
            </>
          )}
        </FieldArray>
      </Section>
    </div>
  );
}

function FixedStages({ title, description, stages }: { title: string; description: string; stages: string[] }) {
  return (
    <Section title={title} sub={description}>
      <div className="flex flex-wrap gap-2">
        {stages.map((name) => (
          <span key={name} className="rounded-md border border-border-1 bg-mist px-3 py-2 font-body text-[13px] font-semibold text-fg-2">
            {name}
          </span>
        ))}
      </div>
    </Section>
  );
}

export function HiringStageStep() {
  const { values } = useFormikContext<JobDetails>();
  return (
    <div className="flex flex-col gap-6">
      <Section title="New candidates" sub="New applications are collected here first.">
        <div className={grid}>
          <SelectField name="screeningAssessment" label="Assessment for new candidates" placeholder="No assessment" options={OPTIONS.assessment} />
        </div>
        <ToggleField name="autoReject" label="Auto-reject by test score" hint="Reject candidates whose assessment score is below the minimum." />
        {values.autoReject && (
          <div className={cn(grid, 'pl-3.5')}>
            <TextField name="autoRejectBelow" type="number" min={0} max={100} label="Reject when the score is below (%)" />
            <div className="flex items-end pb-2">
              <InlineCheck name="autoRejectEmail">Send the rejection email automatically</InlineCheck>
            </div>
          </div>
        )}
      </Section>

      <FixedStages {...FIXED_STAGES.screening} />

      <Section title="In process" sub="Shortlisted candidates are assessed and interviewed. Stages run top to bottom.">
        <FieldArray name="processes">
          {(processes) => (
            <>
              {values.processes.map((process, i) => (
                <div key={process.id} className="flex flex-col gap-3 rounded-xl border border-border-1 p-4">
                  <div className="flex items-end gap-3">
                    <TextField name={`processes.${i}.name`} label={`Process ${i + 1}`} containerClassName="flex-1" />
                    <RemoveRowButton aria-label={`Remove process ${process.name}`} onClick={() => processes.remove(i)} />
                  </div>
                  <FieldArray name={`processes.${i}.stages`}>
                    {(stages) => (
                      <div className="flex flex-col gap-2">
                        {process.stages.map((stage, j) => (
                          <div key={stage.id} className="grid items-end gap-3 md:grid-cols-[1fr_260px_auto]">
                            <TextField name={`processes.${i}.stages.${j}.name`} placeholder="Stage name" list="rc-stage-names" />
                            <SelectField name={`processes.${i}.stages.${j}.assessment`} placeholder="No assessment" options={OPTIONS.assessment} />
                            <RemoveRowButton aria-label={`Remove stage ${stage.name}`} onClick={() => stages.remove(j)} />
                          </div>
                        ))}
                        <div>
                          <AddButton onClick={() => stages.push({ id: newId('s'), name: '', assessment: '' })}>Add Stage</AddButton>
                        </div>
                      </div>
                    )}
                  </FieldArray>
                </div>
              ))}
              <datalist id="rc-stage-names">
                {OPTIONS.stageName.map((item) => (
                  <option key={item.value} value={item.value} />
                ))}
              </datalist>
              <div>
                <AddButton onClick={() => processes.push({ id: newId('p'), name: 'Interview', stages: [] })}>Add Process</AddButton>
              </div>
            </>
          )}
        </FieldArray>
      </Section>

      <FixedStages {...FIXED_STAGES.offer} />
      <FixedStages {...FIXED_STAGES.final} />
    </div>
  );
}

export function HiringTeamStep() {
  const { values, setFieldValue } = useFormikContext<JobDetails>();
  return (
    <Section title="Hiring team" sub="People who work on this job listing. One person can hold more than one role.">
      <div className="flex flex-col gap-4 md:w-[520px]">
        {TEAM_ROLES.map((role) => (
          <div key={role.key} className="flex flex-col gap-1">
            <Label>{role.label}</Label>
            <MultiSelect<string>
              value={values.team[role.key]}
              onChange={(next) => void setFieldValue(`team.${role.key}`, next)}
              options={TEAM_POOL.map((name) => ({ value: name, label: name }))}
              placeholder={`Select ${role.label.toLowerCase()}`}
            />
            <span className="font-body text-xs font-medium text-fg-3">{role.hint}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function PublicationStep() {
  const { values, errors, touched, setFieldValue } = useFormikContext<JobDetails>();
  const platformError = getIn(touched, 'platforms') !== undefined || values.platforms.length === 0 ? (errors.platforms as string | undefined) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <Section title="Publication setting" sub="When the job listing goes live and who can apply.">
        <div className={grid}>
          <DateField name="publishedDate" label="Published date" required placeholder="Select a date" />
          {!values.noClosingDate && <DateField name="closingDate" label="Closing date" required placeholder="Select a date" min={values.publishedDate || undefined} />}
        </div>
        <div className="flex flex-col gap-3">
          <InlineCheck name="noClosingDate">No closing date</InlineCheck>
          <InlineCheck name="autoClose">Close the job listing automatically once the headcount is fulfilled</InlineCheck>
          <InlineCheck name="restrictOne">Restrict to one application per candidate</InlineCheck>
          {values.restrictOne && (
            <div className="pl-7 md:w-[300px]">
              <SelectField name="reapplyMonths" label="Candidates can apply again after" options={OPTIONS.reapply} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Publication platform" sub="Where the job listing is published.">
        <div className="grid gap-2 md:grid-cols-2">
          {PLATFORMS.map((name) => (
            <label key={name} className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border-1 bg-cloud px-3.5 py-3">
              <span className="font-body text-[13px] font-bold text-fg-1">{name}</span>
              <Checkbox
                checked={values.platforms.includes(name)}
                onCheckedChange={(next) =>
                  void setFieldValue('platforms', next === true ? [...values.platforms, name] : values.platforms.filter((item) => item !== name))
                }
                aria-label={`Publish on ${name}`}
              />
            </label>
          ))}
        </div>
        {platformError && <span className="font-body text-xs font-medium text-error-600">{platformError}</span>}
      </Section>
    </div>
  );
}
