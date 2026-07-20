export type SavedResumeMetadata = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  savedAt: string;
  textAvailable?: boolean;
};

type SavedResumeRecord = SavedResumeMetadata & {
  id: "primary";
  data: ArrayBuffer;
  extractedText?: string;
};

const databaseName = "applyproof-local-files";
const databaseVersion = 1;
const storeName = "resume-files";
const primaryResumeId = "primary";
const maxResumeBytes = 10 * 1024 * 1024;

function validateResumeFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "docx" && extension !== "pdf") {
    throw new Error("Choose a Word (.docx) or PDF (.pdf) resume.");
  }
  if (file.size > maxResumeBytes) {
    throw new Error("Choose a resume smaller than 10 MB.");
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ?? new Error("Local resume storage is unavailable."),
      );
  });
}

function complete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("The saved resume could not be updated."),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("The saved resume update was cancelled."),
      );
  });
}

async function readRecord(): Promise<SavedResumeRecord | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(primaryResumeId);
    const record = await new Promise<SavedResumeRecord | undefined>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result as SavedResumeRecord);
        request.onerror = () => reject(request.error);
      },
    );
    await complete(transaction);
    return record ?? null;
  } finally {
    database.close();
  }
}

export async function saveResumeFile(
  file: File,
  extractedText?: string,
): Promise<SavedResumeMetadata> {
  validateResumeFile(file);
  const data = file.arrayBuffer
    ? await file.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
  const metadata: SavedResumeMetadata = {
    name: file.name,
    type:
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    size: file.size,
    lastModified: file.lastModified,
    savedAt: new Date().toISOString(),
    textAvailable: Boolean(extractedText?.trim()),
  };
  const record: SavedResumeRecord = {
    id: primaryResumeId,
    ...metadata,
    data,
    ...(extractedText?.trim()
      ? { extractedText: extractedText.trim().slice(0, 250_000) }
      : {}),
  };
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    await complete(transaction);
    return metadata;
  } finally {
    database.close();
  }
}

export async function loadSavedResumeMetadata(): Promise<SavedResumeMetadata | null> {
  const record = await readRecord();
  if (!record) return null;
  const { name, type, size, lastModified, savedAt, extractedText } = record;
  return {
    name,
    type,
    size,
    lastModified,
    savedAt,
    textAvailable: Boolean(extractedText),
  };
}

export async function loadSavedResumeFile(): Promise<File | null> {
  const record = await readRecord();
  if (!record) return null;
  return new File([record.data], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

export async function loadSavedResumeText(): Promise<string | null> {
  const record = await readRecord();
  return record?.extractedText?.trim() || null;
}

export async function deleteSavedResumeFile() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(primaryResumeId);
    await complete(transaction);
  } finally {
    database.close();
  }
}
