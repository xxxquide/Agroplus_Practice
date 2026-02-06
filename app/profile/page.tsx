import { redirect } from "next/navigation";
import { ProfileClient } from "./_components/profile-client";
import { requireUser } from "@/lib/session";
import { buildDefaultProfile, mergeProfileData } from "@/lib/profile";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }
  const initialProfile = mergeProfileData(user, user.profileData);
  const defaultProfile = buildDefaultProfile(user);
  return <ProfileClient initialProfile={initialProfile} defaultProfile={defaultProfile} />;
}
