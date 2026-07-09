"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserAvatar, getUserInitials, type UserAvatarSource } from "@/lib/user-avatar";

type UserAvatarProps = {
  src?: string | null;
  user?: UserAvatarSource | null;
  sources?: Array<UserAvatarSource | null | undefined>;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  src,
  user,
  sources,
  alt = "Profil fotoğrafı",
  className = "h-10 w-10 rounded-full",
  imageClassName = "h-full w-full object-cover",
  fallbackClassName = "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
}: UserAvatarProps) {
  const allSources = useMemo(() => sources ?? [user], [sources, user]);
  const avatarUrl = src || getUserAvatar(...allSources);
  const initials = getUserInitials(...allSources);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  useEffect(() => {
    setBrokenUrl(null);
  }, [avatarUrl]);

  const showImage = Boolean(avatarUrl && avatarUrl !== brokenUrl);

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden ${className} ${showImage ? "" : fallbackClassName}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? ""}
          alt={alt}
          className={imageClassName}
          onError={() => setBrokenUrl(avatarUrl ?? null)}
        />
      ) : (
        <span className="select-none text-xs font-black leading-none">{initials}</span>
      )}
    </div>
  );
}
