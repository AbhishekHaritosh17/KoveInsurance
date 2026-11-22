import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export interface PickedFile {
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

/**
 * Opens the phone's file chooser. On Android and iPhone this includes Google Drive,
 * iCloud and other connected storage apps.
 */
export async function pickFile(types: string[] = ['*/*']): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const bytes = await new File(a.uri).arrayBuffer();
  return { name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', bytes };
}
