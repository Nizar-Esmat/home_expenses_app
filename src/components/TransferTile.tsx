import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transfer } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';
import { useAppDialog } from '@/components/AppDialog';

interface Props {
  transfer: Transfer;
  currency: string;
  fromAccountName?: string;
  fromAccountIcon?: string;
  toAccountName?: string;
  toAccountIcon?: string;
  onDelete: () => void;
}

export default function TransferTile({
  transfer,
  currency,
  fromAccountName,
  fromAccountIcon,
  toAccountName,
  toAccountIcon,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const { showDialog } = useAppDialog();

  const confirmDelete = () =>
    showDialog({
      title: 'Delete Transfer',
      message: 'Remove this transfer?',
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.row}>
        <View style={styles.icons}>
          <View style={[styles.iconCircle, { backgroundColor: colors.inputFill }]}> 
            {fromAccountIcon ? (
              <Text style={styles.iconEmoji}>{fromAccountIcon}</Text>
            ) : (
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            )}
          </View>
          <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
          <View style={[styles.iconCircle, { backgroundColor: colors.inputFill }]}> 
            {toAccountIcon ? (
              <Text style={styles.iconEmoji}>{toAccountIcon}</Text>
            ) : (
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            )}
          </View>
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}> 
            {`${fromAccountName ?? 'From account'} -> ${toAccountName ?? 'To account'}`}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}> 
            {formatDate(transfer.createdAt)}
          </Text>
          {transfer.note ? (
            <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={1}> 
              {transfer.note}
            </Text>
          ) : null}
          {transfer.feeAmount && transfer.feeAmount > 0 ? (
            <Text style={[styles.fee, { color: colors.danger }]}>
              Fee: {formatCurrency(transfer.feeAmount, currency)}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.primary }]}> 
            {formatCurrency(transfer.amount, currency)}
          </Text>
          <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}> 
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  date: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 12, marginTop: 2 },
  fee: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  right: { alignItems: 'flex-end', marginLeft: 10 },
  amount: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  deleteBtn: { padding: 2 },
});
