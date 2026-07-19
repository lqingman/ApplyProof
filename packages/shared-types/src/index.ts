import { z } from "zod";

export const fieldKindSchema = z.enum([
  "text",
  "email",
  "tel",
  "url",
  "date",
  "textarea",
  "select",
  "radio",
  "checkbox",
]);

export type FieldKind = z.infer<typeof fieldKindSchema>;

export const normalizedFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: fieldKindSchema,
  required: z.boolean(),
  value: z.string(),
  options: z.array(z.string()).default([]),
  maxLength: z.number().int().positive().optional(),
});

export type NormalizedField = z.infer<typeof normalizedFieldSchema>;

export const pageScanSchema = z.object({
  fields: z.array(normalizedFieldSchema),
  blockedCount: z.number().int().nonnegative().default(0),
});

export type PageScan = z.infer<typeof pageScanSchema>;

export const fieldFillSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string(),
});

export type FieldFill = z.infer<typeof fieldFillSchema>;

export const fillResultSchema = z.object({
  fieldId: z.string().min(1),
  status: z.enum([
    "filled",
    "skipped_existing",
    "not_found",
    "unsupported_option",
  ]),
});

export type FillResult = z.infer<typeof fillResultSchema>;

export const pageFillResultSchema = z.object({
  results: z.array(fillResultSchema),
});

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["profile", "education", "experience", "project", "skill"]),
  text: z.string().min(1),
  source: z.string().min(1),
});

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const candidateProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  headline: z.string().min(1),
  identity: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    location: z.string().min(1),
  }),
  links: z.object({
    portfolio: z.string().url(),
  }),
  education: z.object({
    school: z.string().min(1),
    degree: z.string().min(1),
    graduationDate: z.string().min(1),
  }),
  availability: z.object({
    startDate: z.string().min(1),
    relocation: z.enum(["yes", "no"]),
  }),
  evidence: z.array(evidenceRecordSchema),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export const answerDraftFieldSchema = z.object({
  id: z.string().min(1).max(120),
  question: z.string().trim().min(1).max(1000),
  maxCharacters: z.number().int().min(50).max(5000).optional(),
});

export const answerDraftJobSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  requirements: z.array(z.string().trim().min(1).max(200)).max(20),
});

export const answerDraftRequestSchema = z
  .object({
    field: answerDraftFieldSchema,
    job: answerDraftJobSchema,
    evidence: z.array(evidenceRecordSchema).max(20),
  })
  .superRefine((request, context) => {
    const ids = request.evidence.map((record) => record.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Evidence IDs must be unique.",
      });
    }
  });

export type AnswerDraftRequest = z.infer<typeof answerDraftRequestSchema>;

export const answerDraftResponseSchema = z.object({
  fieldId: z.string().min(1),
  draft: z.string(),
  evidenceIds: z.array(z.string()),
  notes: z.array(z.string()),
  followUpQuestion: z.string().nullable(),
  characterCount: z.number().int().nonnegative(),
  fitsLimit: z.boolean(),
});

export type AnswerDraftResponse = z.infer<typeof answerDraftResponseSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("applyproof-api"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
