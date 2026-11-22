import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { DOC_TYPES, label } from '@/lib/constants';
import { friendlyError } from '@/lib/data';
import { confirm, notify } from '@/lib/dialog';
import { pickFile } from '@/lib/files';
import { dateLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { DocumentRow, EntityType } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { must, useQuery } from '@/lib/useQuery';
import { Button, Card, Chips, Muted, Row, Section, Strong } from './ui';

/** Upload and open documents (policy copy, KYC, RC…) attached to a record. */
export function Documents({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { profile } = useAuth();
  const [docType, setDocType] = useState<string>('policy_copy');
  const [uploading, setUploading] = useState(false);
  const { data, reload } = useQuery<DocumentRow[]>(
    async () =>
      must(
        await supabase
          .from('documents')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false }),
      ),
    [entityId],
  );

  async function upload() {
    try {
      const file = await pickFile(['application/pdf', 'image/*', '*/*']);
      if (!file) return;
      setUploading(true);
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${entityType}/${entityId}/${Date.now()}_${safeName}`;
      must(await supabase.storage.from('documents').upload(path, file.bytes, { contentType: file.mimeType }));
      must(
        await supabase.from('documents').insert({ entity_type: entityType, entity_id: entityId, file_path: path, file_name: file.name, doc_type: docType }),
      );
      reload();
    } catch (e) {
      notify('Upload failed', friendlyError(e));
    } finally {
      setUploading(false);
    }
  }

  async function open(d: DocumentRow) {
    try {
      const res = must(await supabase.storage.from('documents').createSignedUrl(d.file_path, 300));
      if (Platform.OS === 'web') window.open(res.signedUrl, '_blank');
      else Linking.openURL(res.signedUrl);
    } catch (e) {
      notify('Could not open file', friendlyError(e));
    }
  }

  async function remove(d: DocumentRow) {
    if (!(await confirm('Delete document?', d.file_name, 'Delete'))) return;
    try {
      must(await supabase.storage.from('documents').remove([d.file_path]));
      must(await supabase.from('documents').delete().eq('id', d.id));
      reload();
    } catch (e) {
      notify('Could not delete', friendlyError(e));
    }
  }

  return (
    <Section title="Documents">
      <Card>
        <Chips label="Type" options={DOC_TYPES} value={docType} onChange={(v) => setDocType(v ?? 'other')} />
        <Button title="Upload file" small onPress={upload} loading={uploading} style={{ alignSelf: 'flex-start' }} />
        <Muted style={{ marginTop: 6, fontSize: 12 }}>PDF or photo. On a phone you can pick from Google Drive too.</Muted>
      </Card>
      {(data ?? []).map((d) => (
        <View key={d.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Strong style={{ fontSize: 14 }}>{d.file_name}</Strong>
              <Muted>
                {label(DOC_TYPES, d.doc_type)} · {dateLabel(d.created_at.slice(0, 10))}
              </Muted>
            </View>
            <Button title="Open" small variant="secondary" onPress={() => open(d)} />
            {profile?.role === 'admin' ? <Button title="Delete" small variant="ghost" onPress={() => remove(d)} /> : null}
          </Row>
        </View>
      ))}
      {data && data.length === 0 ? <Muted>No documents yet.</Muted> : null}
    </Section>
  );
}
