import { z } from "zod";

export const sponsorSignupSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  
  contactName: z.string()
    .trim()
    .min(2, "Contact name must be at least 2 characters")
    .max(100, "Contact name must be less than 100 characters"),
  
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  
  phone: z.string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .max(20, "Phone number must be less than 20 characters"),
  
  website: z.string()
    .trim()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("")),
  
  companyDescription: z.string()
    .trim()
    .min(20, "Company description must be at least 20 characters")
    .max(1000, "Company description must be less than 1000 characters"),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SponsorSignupFormData = z.infer<typeof sponsorSignupSchema>;
