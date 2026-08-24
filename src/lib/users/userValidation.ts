import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Keep names under 120 characters.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})
