import React, { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText, Button, FadeIn, GlassCard, Header, InfoCallout, Screen, SectionHeader, TextField, TitleBlock, useToast } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { confirmMasterPassword, exportVaultSnapshot, importPasswords } from '../../services/fileStorage';
import { parseLoginCSV, toCSV } from '../../utils/csv';

/**
 * Easy import and export — Phase 1 participants said they would only move a
 * few low-risk accounts at first, and wanted to be able to take their data out.
 */
export const ImportExportScreen: React.FC<{ navigation: any }> = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [master, setMaster] = useState('');
  const [exportError, setExportError] = useState<string>();
  const [exporting, setExporting] = useState(false);

  const parsed = useMemo(() => (csv.trim() ? parseLoginCSV(csv) : null), [csv]);

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setCsv(text);
  };

  const doImport = async () => {
    if (!parsed?.logins.length) return;
    setImporting(true);
    try {
      const added = await importPasswords(parsed.logins);
      setCsv('');
      await Clipboard.setStringAsync('');
      toast.show(added ? `Imported ${added} password${added === 1 ? '' : 's'}` : 'Nothing new to import — all were already saved');
    } catch (e: any) {
      toast.show({ message: e?.message ?? 'Import failed', tone: 'danger' });
    } finally {
      setImporting(false);
    }
  };

  const doExport = async () => {
    setExportError(undefined);
    setExporting(true);
    try {
      if (!(await confirmMasterPassword(master))) {
        setExportError('Incorrect master password.');
        return;
      }
      const snap = exportVaultSnapshot();
      const content = toCSV([
        ['name', 'url', 'username', 'password', 'note'],
        ...snap.passwords.map((p) => [p.website, p.website, p.username, p.password, p.notes ?? '']),
      ]);
      setMaster('');
      await Share.share({ title: 'UPIC passwords export', message: content });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen header={<Header title="Import & export" />}>
      <FadeIn>
        <TitleBlock title="Move passwords in or out" subtitle="Your data is yours. Start with a few accounts, and take everything with you whenever you like." />
      </FadeIn>

      <SectionHeader title="Import from a browser or another manager" />
      <FadeIn delay={60}>
        <GlassCard style={{ gap: 4 }}>
          <AppText variant="body" secondary style={{ marginBottom: 12 }}>
            Export a CSV file from Chrome, Edge, Safari, Firefox, Bitwarden or 1Password, open it, copy everything and paste it below.
          </AppText>
          <TextField
            label="CSV contents"
            icon="file-delimited-outline"
            placeholder={'name,url,username,password\nGitHub,github.com,me@example.com,…'}
            value={csv}
            onChangeText={setCsv}
            multiline
            mono
            autoCapitalize="none"
            autoCorrect={false}
            style={{ minHeight: 110, textAlignVertical: 'top', fontSize: 13 }}
          />
          {parsed ? (
            <AppText variant="label" weight="semibold" color={parsed.logins.length ? theme.success : theme.error} style={{ marginBottom: 12 }}>
              {parsed.logins.length
                ? `Ready to import ${parsed.logins.length} login${parsed.logins.length === 1 ? '' : 's'}${parsed.skipped ? ` (${parsed.skipped} skipped)` : ''}`
                : 'No logins found — check that the first row has column names like url, username, password.'}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Paste" variant="secondary" icon="clipboard-text-outline" onPress={paste} style={{ flex: 1 }} />
            <Button title="Import" icon="tray-arrow-down" onPress={doImport} loading={importing} disabled={!parsed?.logins.length} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      </FadeIn>
      <FadeIn delay={100} style={{ marginTop: 12 }}>
        <InfoCallout icon="delete-clock-outline" tone="warning" title="Delete the CSV afterwards" body="The exported file is not encrypted. After importing, delete it from your downloads. UPIC clears the clipboard for you." />
      </FadeIn>

      <SectionHeader title="Export your passwords" />
      <FadeIn delay={140}>
        <GlassCard>
          <AppText variant="body" secondary style={{ marginBottom: 14 }}>
            Creates a CSV that other password managers can import. Because it is readable by anyone who gets the file, UPIC asks for your master password first.
          </AppText>
          <TextField label="Master password" icon="shield-key-outline" value={master} onChangeText={setMaster} secret error={exportError} />
          <Button title="Export as CSV" variant="secondary" icon="export-variant" onPress={doExport} loading={exporting} disabled={!master} />
        </GlassCard>
      </FadeIn>
    </Screen>
  );
};
