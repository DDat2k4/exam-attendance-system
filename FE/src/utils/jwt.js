import { jwtDecode } from "jwt-decode";

export const getUserFromToken = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const sub = decoded?.sub;
    const subAsNum = typeof sub === "number" ? sub : (/^\d+$/.test(sub || "") ? Number(sub) : undefined);
    const lsUid = localStorage.getItem("userId");
    const resolvedId =
      decoded?.userId ??
      decoded?.id ??
      subAsNum ??
      (lsUid != null ? (Number(lsUid) || lsUid) : undefined);

    return {
      username: decoded.sub,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      exp: decoded.exp,
      avatar: localStorage.getItem("avatar") || null,
      id: resolvedId ?? null,
      userId: resolvedId ?? null,
    };
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};

// Lấy nhanh userId
export const getUserId = () => {
  const u = getUserFromToken();
  return u?.id ?? u?.userId ?? null;
};