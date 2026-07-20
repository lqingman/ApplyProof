import {
  candidateProfileSchema,
  type CandidateProfile,
  rememberedAnswersSchema,
  type RememberedAnswer,
} from "@applyproof/shared-types";

const PROFILE_STORAGE_KEY = "applyproof.myProfile.v1";
const ANSWERS_STORAGE_KEY = "applyproof.reusableAnswers.v1";

const choiceLabels = {
  yes: "Yes",
  no: "No",
  decline: "Prefer not to say",
} as const;

type LocalStorageArea = Pick<
  chrome.storage.StorageArea,
  "get" | "set" | "remove"
>;

function localStorageArea(): LocalStorageArea {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    throw new Error("Local profile storage is unavailable in this browser.");
  }
  return chrome.storage.local;
}

export async function loadMyProfile(): Promise<CandidateProfile | null> {
  const stored = await localStorageArea().get(PROFILE_STORAGE_KEY);
  const value = stored[PROFILE_STORAGE_KEY];
  if (value === undefined) return null;
  const parsed = candidateProfileSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      "Your saved profile could not be read. Reset it locally and create it again.",
    );
  }
  return parsed.data;
}

export async function saveMyProfile(profile: CandidateProfile) {
  const validated = candidateProfileSchema.parse(profile);
  const existingAnswers = await loadRememberedAnswers();
  const authorizationChoices = [
    {
      canonicalKey: "work_authorization.canada.authorized",
      choice: validated.workAuthorization.canada.authorized,
    },
    {
      canonicalKey: "work_authorization.canada.sponsorship",
      choice: validated.workAuthorization.canada.sponsorship,
    },
  ];
  const authorizationAnswers: RememberedAnswer[] = authorizationChoices.map(
    ({ canonicalKey, choice }) => {
      const value = choiceLabels[choice];
      const prior = existingAnswers.find(
        (answer) => answer.canonicalKey === canonicalKey,
      );
      return {
        canonicalKey,
        value,
        source: "explicit_profile_choice",
        confirmedAt:
          prior?.value === value ? prior.confirmedAt : new Date().toISOString(),
        scope: { country: "CA" },
        timeDependent: false,
      };
    },
  );
  const authorizationKeys = new Set([
    "work_authorization.canada",
    ...authorizationAnswers.map((answer) => answer.canonicalKey),
  ]);
  const rememberedAnswers = rememberedAnswersSchema.parse([
    ...existingAnswers.filter(
      (answer) => !authorizationKeys.has(answer.canonicalKey),
    ),
    ...authorizationAnswers,
  ]);
  await localStorageArea().set({
    [PROFILE_STORAGE_KEY]: validated,
    [ANSWERS_STORAGE_KEY]: rememberedAnswers,
  });
  return validated;
}

export async function loadRememberedAnswers(): Promise<RememberedAnswer[]> {
  const stored = await localStorageArea().get(ANSWERS_STORAGE_KEY);
  const value = stored[ANSWERS_STORAGE_KEY];
  if (value === undefined) return [];
  const parsed = rememberedAnswersSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Saved application preferences could not be read.");
  }
  return parsed.data;
}

export async function resetMyProfile() {
  await localStorageArea().remove([PROFILE_STORAGE_KEY, ANSWERS_STORAGE_KEY]);
}
