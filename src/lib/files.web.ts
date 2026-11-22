import * as DocumentPicker from 'expo-document-picker';

export interface PickedFile {
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

/** Opens the computer's file chooser (files synced from Google Drive work too). */
export async function pickFile(types: string[] = ['*/*']): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const bytes = a.file ? await a.file.arrayBuffer() : await (await fetch(a.uri)).arrayBuffer();
  return { name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', bytes };
}
