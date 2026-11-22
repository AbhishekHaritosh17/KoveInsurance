import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as XLSX from 'xlsx';

import { Button, Card, Chips, Muted, Row, Screen, Section, Strong } from '@/components/ui';
import { fetchInsurers, friendlyError } from '@/lib/data';
import { notify } from '@/lib/dialog';
import { pickFile } from '@/lib/files';
import { COLUMNS, mapColumns, matchInsurer, readWorkbook, templateWorkbook, toClientRow, toLeadRow, toPolicyRow, validate, type ImportKind, type ParsedSheet, type RowIssue } from '@/lib/importer';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { must } from '@/lib/useQuery';

const KINDS: { value: ImportKind; label: string }[] = [
  { value: 'policies', label: 'Policies' },
  { value: 'clients', label: 'Clients' },
  { value: 'leads', label: 'Leads' },
];

const BATCH = 200;
const key = (name: string, phone: string | null) => `${name.trim().toLowerCase()}|${(phone ?? '').replace(/\D/g, '').slice(-10)}`;

export default function ImportScreen() {
  const [kind, setKind] = useState<ImportKind>('policies');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function reset(k: ImportKind) {
    setKind(k);
    setSheet(null);
    setFileName(null);
    setIssues([]);
    setDone(null);
  }

  async function choose() {
    try {
      const f = await pickFile([
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/comma-separated-values',
        '*/*',
      ]);
      if (!f) return;
      const raw = readWorkbook(f.bytes);
      const parsed = mapColumns(kind, raw);
      setFileName(f.name);
      setSheet(parsed);
      setIssues(validate(kind, parsed.rows));
      setDone(null);
    } catch (e) {
      notify('Could not read file', 'Please choose an Excel (.xlsx, .xls) or CSV file.\n\n' + friendlyError(e));
    }
  }

  function downloadTemplate() {
    XLSX.writeFile(templateWorkbook(kind), `fizzy-${kind}-template.xlsx`);
  }

  async function runImport() {
    if (!sheet) return;
    const badRows = new Set(issues.map((i) => i.row));
    const rows = sheet.rows.filter((_, i) => !badRows.has(i + 2));
    if (!rows.length) return notify('Nothing to import', 'Fix the rows with problems and try again.');
    setBusy(true);
    setProgress('Starting…');
    try {
      if (kind === 'leads') {
        const leadRows = rows.map(toLeadRow);
        for (let i = 0; i < leadRows.length; i += BATCH) {
          setProgress(`Leads ${i + 1}–${Math.min(i + BATCH, leadRows.length)} of ${leadRows.length}`);
          must(await supabase.from('leads').insert(leadRows.slice(i, i + BATCH)));
        }
        setDone(`Imported ${leadRows.length} leads.`);
        return;
      }

      // Clients: reuse existing ones matched by name + mobile.
      setProgress('Matching clients…');
      const existing = must(await supabase.from('clients').select('id,name,phone').limit(10000)) as { id: string; name: string; phone: string | null }[];
      const clientIds = new Map(existing.map((c) => [key(c.name, c.phone), c.id]));
      const byNameOnly = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
      const newClients = new Map<string, ReturnType<typeof toClientRow>>();
      for (const r of rows) {
        const c = toClientRow(r);
        const k = key(c.name, c.phone);
        if (!clientIds.has(k) && !(kind === 'policies' && !c.phone && byNameOnly.has(c.name.trim().toLowerCase())) && !newClients.has(k)) newClients.set(k, c);
      }
      const toCreate = [...newClients.values()];
      for (let i = 0; i < toCreate.length; i += BATCH) {
        setProgress(`Creating clients ${i + 1}–${Math.min(i + BATCH, toCreate.length)} of ${toCreate.length}`);
        const created = must(await supabase.from('clients').insert(toCreate.slice(i, i + BATCH)).select('id,name,phone')) as { id: string; name: string; phone: string | null }[];
        for (const c of created) {
          clientIds.set(key(c.name, c.phone), c.id);
          byNameOnly.set(c.name.trim().toLowerCase(), c.id);
        }
      }
      if (kind === 'clients') {
        setDone(`Imported ${toCreate.length} new clients (${rows.length - toCreate.length} already existed).`);
        return;
      }

      const insurers = await fetchInsurers();
      let unknownInsurers = 0;
      const policyRows = rows.map((r) => {
        const c = toClientRow(r);
        const { insurerName, ...p } = toPolicyRow(r);
        const insurer_id = matchInsurer(insurerName, insurers);
        if (insurerName && !insurer_id) unknownInsurers++;
        return {
          ...p,
          notes: insurerName && !insurer_id ? [p.notes, `Insurer: ${insurerName}`].filter(Boolean).join(' · ') : p.notes,
          insurer_id,
          client_id: clientIds.get(key(c.name, c.phone)) ?? byNameOnly.get(c.name.trim().toLowerCase())!,
          payment_status: 'paid' as const,
          status: 'active' as const,
        };
      });
      for (let i = 0; i < policyRows.length; i += BATCH) {
        setProgress(`Policies ${i + 1}–${Math.min(i + BATCH, policyRows.length)} of ${policyRows.length}`);
        must(await supabase.from('policies').insert(policyRows.slice(i, i + BATCH)));
      }
      setDone(
        `Imported ${policyRows.length} policies and ${toCreate.length} new clients.` +
          (unknownInsurers ? ` ${unknownInsurers} rows had an insurer name we didn't recognise; it is saved in the policy notes.` : ''),
      );
    } catch (e) {
      notify('Import stopped', friendlyError(e) + '\n\nRows before this point were saved.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const cols = COLUMNS[kind];
  const okCount = sheet ? sheet.rows.length - new Set(issues.map((i) => i.row)).size : 0;

  return (
    <Screen>
      <Card>
        <Chips label="What are you importing?" options={KINDS} value={kind} onChange={(v) => reset(v ?? 'policies')} />
        <Muted style={{ marginBottom: 8 }}>
          The first row of the sheet must be column headings. Names like these are recognised automatically:{' '}
          <Text style={{ color: colors.text }}>{cols.slice(0, 12).map((c) => c.label).join(', ')}</Text>
          {cols.length > 12 ? '…' : ''}. Dates can be DD-MM-YYYY.
        </Muted>
        <Row>
          <Button title="Choose Excel file" onPress={choose} disabled={busy} />
          {Platform.OS === 'web' ? <Button title="Download template" variant="secondary" onPress={downloadTemplate} /> : null}
        </Row>
        <Muted style={{ marginTop: 8, fontSize: 12 }}>
          {Platform.OS === 'web' ? 'Pick a file from your computer (Google Drive for desktop folders work too).' : 'You can pick from Files, Google Drive or email attachments.'}
        </Muted>
      </Card>

      {sheet ? (
        <Section title={fileName ?? 'File'}>
          <Card>
            <Strong>
              {sheet.rows.length} rows found · {okCount} ready
            </Strong>
            {sheet.missingRequired.length ? (
              <Text style={{ color: colors.danger, marginTop: 6 }}>Missing required column: {sheet.missingRequired.join(', ')}. Rename the heading in your sheet and choose the file again.</Text>
            ) : null}
            <Muted style={{ marginTop: 8 }}>Columns matched:</Muted>
            {Object.entries(sheet.mapping).map(([k, h]) => (
              <Muted key={k} style={{ color: colors.text }}>
                • {h} → {cols.find((c) => c.key === k)?.label}
              </Muted>
            ))}
            {sheet.unmatchedHeaders.length ? <Muted style={{ marginTop: 6 }}>Ignored columns: {sheet.unmatchedHeaders.join(', ')}</Muted> : null}
          </Card>
          {issues.length ? (
            <Card style={{ borderColor: colors.warning }}>
              <Strong style={{ color: colors.warning }}>{issues.length} problems. These rows will be skipped:</Strong>
              {issues.slice(0, 20).map((i, n) => (
                <Muted key={n}>
                  Row {i.row}: {i.message}
                </Muted>
              ))}
              {issues.length > 20 ? <Muted>…and {issues.length - 20} more</Muted> : null}
            </Card>
          ) : null}
          {!done ? (
            <Button title={busy ? progress ?? 'Importing…' : `Import ${okCount} ${kind}`} onPress={runImport} loading={busy} disabled={!!sheet.missingRequired.length || okCount === 0} />
          ) : null}
        </Section>
      ) : null}

      {done ? (
        <Card style={{ borderColor: colors.success }}>
          <Strong style={{ color: colors.success }}>Done</Strong>
          <Muted style={{ color: colors.text, marginTop: 4 }}>{done}</Muted>
          <View style={{ height: 8 }} />
          <Row>
            <Button small title={kind === 'leads' ? 'Open leads' : kind === 'clients' ? 'Open clients' : 'Open renewals'} onPress={() => router.replace(kind === 'leads' ? '/leads' : kind === 'clients' ? '/clients' : '/renewals')} />
            <Button small variant="secondary" title="Import another file" onPress={() => reset(kind)} />
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
