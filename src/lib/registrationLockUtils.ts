/**
 * Unified Registration Locking & Editability Utilities
 * 
 * Rules:
 * 1. Under scheduled time (now <= deadline, or if registration deadline is extended):
 *    - The institution should be able to edit assignments and register candidates.
 *    - Even if the institution previously confirmed/submitted, editing remains open
 *      automatically without requiring the admin to unlock each institution one-by-one.
 * 2. An institution is locked from editing ONLY IF:
 *    a) The scheduled deadline has passed (now > deadline), OR
 *    b) The Zonal Admin has officially confirmed & finalized the institution
 *       (i.e. chest numbers or magazine code have been assigned by the Zone).
 * 3. Special admin unlocks (offStageUnlocked, onStageUnlocked, registrationUnlocked)
 *    always grant editing access regardless of deadline or confirmation.
 */

export interface TeamRegistrationEvent {
  registrationStart?: Date | string | null;
  registrationEnd?: Date | string | null;
  institutionRegistrationEndDate?: Date | string | null;
  offStageRegistrationEnd?: Date | string | null;
  onStageRegistrationEnd?: Date | string | null;
  parent?: TeamRegistrationEvent | null;
}

export interface CandidateWithStage {
  id?: string;
  chestNumber?: string | null;
  programs?: Array<{
    program?: {
      stageType?: string | null;
    } | null;
  }> | null;
}

export interface TeamWithRegistrationData {
  id?: string;
  isAssignmentsConfirmed?: boolean;
  isOnStageConfirmed?: boolean;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  registrationUnlocked?: boolean;
  magazineCode?: string | null;
  event?: TeamRegistrationEvent | null;
  candidates?: CandidateWithStage[] | null;
}

export function getRegistrationLockStatus(
  team?: TeamWithRegistrationData | null,
  eventOverride?: TeamRegistrationEvent | null,
  candidatesOverride?: CandidateWithStage[] | null,
  isAdmin: boolean = false
) {
  if (isAdmin) {
    return {
      isOffStageOpen: true,
      isOnStageOpen: true,
      isCandidateRegistrationOpen: true,
      isOffStageDeadlinePassed: false,
      isOnStageDeadlinePassed: false,
      isGeneralDeadlinePassed: false,
      isZoneConfirmedOffStage: false,
      isZoneConfirmedOnStage: false,
      isCollegeSubmittedOffStage: Boolean(team?.isAssignmentsConfirmed),
      isCollegeSubmittedOnStage: Boolean(team?.isOnStageConfirmed),
      offDeadline: null,
      onDeadline: null,
      generalDeadline: null,
      statusMessage: "",
    };
  }

  const now = new Date();
  const event = eventOverride || team?.event;
  const candidates = candidatesOverride || team?.candidates || [];

  // 1. Resolve Deadlines (Zone Event takes precedence, falls back to parent State Event)
  const offDeadlineRaw =
    event?.offStageRegistrationEnd ||
    event?.parent?.offStageRegistrationEnd ||
    event?.institutionRegistrationEndDate ||
    event?.parent?.institutionRegistrationEndDate ||
    event?.registrationEnd ||
    event?.parent?.registrationEnd;

  const onDeadlineRaw =
    event?.onStageRegistrationEnd ||
    event?.parent?.onStageRegistrationEnd ||
    event?.institutionRegistrationEndDate ||
    event?.parent?.institutionRegistrationEndDate ||
    event?.registrationEnd ||
    event?.parent?.registrationEnd;

  const generalDeadlineRaw =
    event?.institutionRegistrationEndDate ||
    event?.parent?.institutionRegistrationEndDate ||
    event?.registrationEnd ||
    event?.parent?.registrationEnd;

  const startRaw = event?.registrationStart || event?.parent?.registrationStart;

  const offDeadline = offDeadlineRaw ? new Date(offDeadlineRaw) : null;
  const onDeadline = onDeadlineRaw ? new Date(onDeadlineRaw) : null;
  const generalDeadline = generalDeadlineRaw ? new Date(generalDeadlineRaw) : null;
  const startDate = startRaw ? new Date(startRaw) : null;

  const isNotStarted = startDate ? now < startDate : false;
  const isOffStageDeadlinePassed = offDeadline ? now > offDeadline : false;
  const isOnStageDeadlinePassed = onDeadline ? now > onDeadline : false;
  const isGeneralDeadlinePassed = generalDeadline ? now > generalDeadline : false;

  // 2. Resolve Zone Admin Confirmation (Chest Numbers / Magazine Code assigned)
  const offCandidates = candidates.filter((c) =>
    c.programs?.some((p) => p.program?.stageType === "OFF_STAGE")
  );
  const onCandidates = candidates.filter((c) =>
    c.programs?.some((p) => p.program?.stageType === "ON_STAGE")
  );

  const hasOffStageChestNumber = offCandidates.some((c) => Boolean(c.chestNumber));
  const hasOnStageChestNumber = onCandidates.some((c) => Boolean(c.chestNumber));
  const hasAnyChestNumber = candidates.some((c) => Boolean(c.chestNumber));

  // Off-stage is confirmed by Zone Admin if candidates have chest numbers OR magazine code was assigned by Zone
  const isZoneConfirmedOffStage = Boolean(hasOffStageChestNumber || team?.magazineCode);

  // On-stage is confirmed by Zone Admin if on-stage candidates have chest numbers AND isOnStageConfirmed is true
  const isZoneConfirmedOnStage = Boolean(hasOnStageChestNumber && team?.isOnStageConfirmed);

  // 3. Admin Unlock Overrides
  const isOffStageUnlocked = Boolean(team?.offStageUnlocked || team?.registrationUnlocked);
  const isOnStageUnlocked = Boolean(team?.onStageUnlocked || team?.registrationUnlocked);
  const isGlobalUnlocked = Boolean(team?.registrationUnlocked);

  // 4. Determine Openness:
  // An institution can edit if:
  // - Admin unlocked it, OR
  // - Current time is within scheduled registration window (!deadlinePassed) AND Zone Admin hasn't finalized it (!isZoneConfirmed)
  const isOffStageOpen =
    !isNotStarted &&
    (isOffStageUnlocked || (!isOffStageDeadlinePassed && !isZoneConfirmedOffStage));

  const isOnStageOpen =
    !isNotStarted &&
    (isOnStageUnlocked || (!isOnStageDeadlinePassed && !isZoneConfirmedOnStage));

  const isCandidateRegistrationOpen =
    !isNotStarted &&
    (isGlobalUnlocked ||
      isOffStageUnlocked ||
      isOnStageUnlocked ||
      isOffStageOpen ||
      isOnStageOpen ||
      (!isGeneralDeadlinePassed && !hasAnyChestNumber));

  // 5. College Submission Status
  const isCollegeSubmittedOffStage = Boolean(team?.isAssignmentsConfirmed);
  const isCollegeSubmittedOnStage = Boolean(team?.isOnStageConfirmed);

  // 6. User-friendly Status Message
  let statusMessage = "";
  if (isNotStarted && startDate) {
    statusMessage = `Registration will open on ${startDate.toLocaleString()}.`;
  } else if (!isCandidateRegistrationOpen) {
    if (hasAnyChestNumber || isZoneConfirmedOffStage || isZoneConfirmedOnStage) {
      statusMessage =
        "Official Registration has been confirmed by the Zone Admin with Chest Numbers assigned. Contact your Zone Admin if an unlock is required.";
    } else {
      statusMessage =
        "Registration deadlines for Off-Stage and On-Stage programs have passed. Contact your Zone Admin to request an unlock.";
    }
  }

  return {
    isOffStageOpen,
    isOnStageOpen,
    isCandidateRegistrationOpen,
    isOffStageDeadlinePassed,
    isOnStageDeadlinePassed,
    isGeneralDeadlinePassed,
    isNotStarted,
    isZoneConfirmedOffStage,
    isZoneConfirmedOnStage,
    hasAnyChestNumber,
    isCollegeSubmittedOffStage,
    isCollegeSubmittedOnStage,
    isOffStageUnlocked,
    isOnStageUnlocked,
    isGlobalUnlocked,
    offDeadline,
    onDeadline,
    generalDeadline,
    startDate,
    statusMessage,
  };
}
