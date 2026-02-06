import { redirect } from "next/navigation";
import { SettingsClient } from "./_components/settings-client";
import { requireUser } from "@/lib/session";
import { buildDefaultSettings, mergeSettingsData } from "@/lib/settings";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }
  const initialSettings = mergeSettingsData(user, user.settingsData);
  const defaultSettings = buildDefaultSettings(user);
  return (
    <SettingsClient
      initialSettings={initialSettings}
      defaultSettings={defaultSettings}
    />
  );
}
