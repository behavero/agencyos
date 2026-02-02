import { z } from 'zod'

// ============================================
// COMMON SCHEMAS
// ============================================

export const UUIDSchema = z.string().uuid('Invalid UUID format')

export const DateSchema = z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format')

export const PositiveNumberSchema = z.number().positive('Must be a positive number')

export const NonEmptyStringSchema = z.string().min(1, 'Cannot be empty')

// ============================================
// EXPENSE SCHEMAS
// ============================================

export const ExpenseCategorySchema = z.enum([
  'software',
  'salaries',
  'marketing',
  'equipment',
  'office',
  'travel',
  'other',
])

export const ExpenseCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  amount: z.number().positive('Amount must be positive'),
  category: ExpenseCategorySchema,
  description: z.string().max(500).optional(),
  model_id: UUIDSchema.optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
})

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial()

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const MessageSendSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)'),
  recipient_id: UUIDSchema.optional(),
  media_ids: z.array(z.string()).optional(),
  price: z.number().min(0).max(500).optional(),
})

export const MassMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  included_lists: z
    .object({
      smart_list_uuids: z.array(UUIDSchema).optional(),
      custom_list_uuids: z.array(UUIDSchema).optional(),
    })
    .optional(),
  excluded_lists: z
    .object({
      smart_list_uuids: z.array(UUIDSchema).optional(),
      custom_list_uuids: z.array(UUIDSchema).optional(),
    })
    .optional(),
  media_ids: z.array(z.string()).optional(),
  price: z.number().min(0).max(500).optional().nullable(),
  schedule_at: DateSchema.optional(),
})

// ============================================
// AGENCY SCHEMAS
// ============================================

export const AgencySettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(100, 'Agency name too long'),
  tax_jurisdiction: z.enum(['RO', 'US', 'EE', 'FR']).optional(),
  tax_rate: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(1, 'Tax rate cannot exceed 100%')
    .optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'RON']).optional(),
})

// ============================================
// MODEL SCHEMAS
// ============================================

export const ModelCreateSchema = z.object({
  name: z.string().min(2).max(100),
  fanvue_username: z.string().optional(),
  fanvue_access_token: z.string().optional(),
  fanvue_refresh_token: z.string().optional(),
})

export const ModelUpdateSchema = ModelCreateSchema.partial()

// ============================================
// SOCIAL STATS SCHEMAS
// ============================================

export const SocialPlatformSchema = z.enum(['instagram', 'tiktok', 'x', 'youtube'])

export const SocialStatsCreateSchema = z.object({
  model_id: UUIDSchema,
  platform: SocialPlatformSchema,
  followers: z.number().int().min(0).optional().default(0),
  views: z.number().int().min(0).optional().default(0),
  likes: z.number().int().min(0).optional().default(0),
  comments: z.number().int().min(0).optional().default(0),
  shares: z.number().int().min(0).optional().default(0),
  date: z.string().optional(),
})

// ============================================
// QUEST SCHEMAS
// ============================================

export const QuestCreateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  task_type: z.string().min(1),
  xp_reward: z.number().int().positive().max(10000).optional().default(50),
  target_count: z.number().int().positive().optional(),
  verification_type: z
    .enum(['MANUAL', 'API_MESSAGES', 'API_POSTS', 'API_REVENUE', 'API_SUBSCRIBERS'])
    .optional(),
  model_id: UUIDSchema.optional(),
  is_daily: z.boolean().optional().default(false),
})

// ============================================
// CHAT NOTES SCHEMAS
// ============================================

export const ChatNoteSchema = z.object({
  fanvue_user_id: z.string().min(1),
  model_id: UUIDSchema,
  note_content: z.string().max(5000),
})

// ============================================
// TRACKING LINK SCHEMAS
// ============================================

export const TrackingLinkCreateSchema = z.object({
  name: z.string().min(2).max(100),
  external_social_platform: z.string().min(1),
})

// ============================================
// VALIDATION HELPERS
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError }

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
}

/**
 * Create a 400 Bad Request response from Zod errors
 */
export function badRequestResponse(error: z.ZodError) {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}
