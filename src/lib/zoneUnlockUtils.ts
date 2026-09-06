export interface ZoneUnlockStatus {
  isAllowed: boolean;
  mode: 'FIXED_TIME' | 'HIDDEN' | 'ALWAYS_ALLOWED';
  message: string;
  windowStart: Date | null;
  windowEnd: Date | null;
}

export function getZoneUnlockStatus(event: {
  zoneUnlockMode?: string | null;
  zoneUnlockWindowStart?: Date | string | null;
  zoneUnlockWindowEnd?: Date | string | null;
  parent?: {
    zoneUnlockMode?: string | null;
    zoneUnlockWindowStart?: Date | string | null;
    zoneUnlockWindowEnd?: Date | string | null;
  } | null;
} | null | undefined): ZoneUnlockStatus {
  if (!event) {
    return {
      isAllowed: false,
      mode: 'HIDDEN',
      message: 'No active event configuration found.',
      windowStart: null,
      windowEnd: null,
    };
  }

  // Resolve mode and time window, inheriting from parent event if not overridden on child
  const mode = (event.zoneUnlockMode || event.parent?.zoneUnlockMode || 'FIXED_TIME') as 'FIXED_TIME' | 'HIDDEN' | 'ALWAYS_ALLOWED';
  const startRaw = event.zoneUnlockWindowStart ?? event.parent?.zoneUnlockWindowStart ?? null;
  const endRaw = event.zoneUnlockWindowEnd ?? event.parent?.zoneUnlockWindowEnd ?? null;
  const windowStart = startRaw ? new Date(startRaw) : null;
  const windowEnd = endRaw ? new Date(endRaw) : null;

  if (mode === 'HIDDEN') {
    return {
      isAllowed: false,
      mode: 'HIDDEN',
      message: 'Registration unlock is currently hidden & disabled for Zonal Admins by Super Admin.',
      windowStart,
      windowEnd,
    };
  }

  if (mode === 'ALWAYS_ALLOWED') {
    return {
      isAllowed: true,
      mode: 'ALWAYS_ALLOWED',
      message: 'Registration unlock is permanently open for Zonal Admins.',
      windowStart,
      windowEnd,
    };
  }

  // mode === 'FIXED_TIME'
  const now = new Date();

  if (!windowStart && !windowEnd) {
    return {
      isAllowed: false,
      mode: 'FIXED_TIME',
      message: 'Fixed time window has not been set by Super Admin yet.',
      windowStart: null,
      windowEnd: null,
    };
  }

  if (windowStart && now < windowStart) {
    return {
      isAllowed: false,
      mode: 'FIXED_TIME',
      message: `Registration unlock window is scheduled to open on ${windowStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST.`,
      windowStart,
      windowEnd,
    };
  }

  if (windowEnd && now > windowEnd) {
    return {
      isAllowed: false,
      mode: 'FIXED_TIME',
      message: `Registration unlock window expired on ${windowEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST.`,
      windowStart,
      windowEnd,
    };
  }

  return {
    isAllowed: true,
    mode: 'FIXED_TIME',
    message: `Registration unlock is currently OPEN for Zone Admins until ${windowEnd ? windowEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST' : 'further notice'}.`,
    windowStart,
    windowEnd,
  };
}
