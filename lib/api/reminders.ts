import { apiClient } from "@/lib/api-client";

export interface ReminderPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  daysBefore: number;
}

export const remindersApi = {
  get: () => apiClient.get<ReminderPreferences>("/api/users/me/reminders"),

  update: (data: Partial<ReminderPreferences>) =>
    apiClient.put<ReminderPreferences>("/api/users/me/reminders", data),
};
