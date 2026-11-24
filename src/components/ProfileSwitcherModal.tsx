import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useUser } from '@/contexts/UserContext';

interface SwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSwitcherModal({ visible, onClose }: SwitcherProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { users, activeUser, isSwitching, switchUser, createUser } = useUser();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCreating(false);
      setNewName('');
      setError('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSelect = async (userId: number) => {
    if (submitting || isSwitching) return;
    if (activeUser?.id === userId) {
      onClose();
      return;
    }
    try {
      setSubmitting(true);
      await switchUser(userId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to switch profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (submitting || isSwitching) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Please enter a profile name.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await createUser(trimmed, true);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!submitting) onClose();
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Switch Profile
              </Text>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close profile switcher"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {users.map((user) => {
                const isActive = user.id === activeUser?.id;
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userRow,
                      {
                        backgroundColor: isActive
                          ? colors.primary + '18'
                          : colors.inputFill,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSelect(user.id)}
                    disabled={submitting}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Profile ${user.name}${isActive ? ', active' : ''}`}
                  >
                    <View style={styles.userLeft}>
                      <Ionicons
                        name={isActive ? 'person-circle' : 'person-circle-outline'}
                        size={26}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[styles.userName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                    </View>
                    {isActive ? (
                      <View
                        style={[
                          styles.activeBadge,
                          { backgroundColor: colors.primary + '26' },
                        ]}
                      >
                        <Text
                          style={[styles.activeBadgeText, { color: colors.primary }]}
                        >
                          Active
                        </Text>
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {creating ? (
                <View
                  style={[
                    styles.createBox,
                    { backgroundColor: colors.inputFill, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.createLabel, { color: colors.textSecondary }]}>
                    New Profile Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: error ? colors.danger : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={newName}
                    onChangeText={(t) => {
                      setNewName(t);
                      if (error) setError('');
                    }}
                    placeholder="e.g. Business, Family..."
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    maxLength={32}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                  />
                  {error ? (
                    <Text style={[styles.errorText, { color: colors.danger }]}>
                      {error}
                    </Text>
                  ) : null}
                  <View style={styles.createActions}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.border }]}
                      onPress={() => {
                        setCreating(false);
                        setNewName('');
                        setError('');
                      }}
                      disabled={submitting}
                    >
                      <Text
                        style={[styles.cancelBtnText, { color: colors.textSecondary }]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                      onPress={handleCreate}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <Text
                          style={[styles.confirmBtnText, { color: colors.onPrimary }]}
                        >
                          Create & Switch
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: colors.primary }]}
                  onPress={() => setCreating(true)}
                  disabled={submitting}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Create new profile"
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>
                    Create New Profile
                  </Text>
                </TouchableOpacity>
              )}

              {!creating && error ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface NameModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialValue?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (name: string) => Promise<void>;
}

export function ProfileNameModal({
  visible,
  title,
  subtitle,
  initialValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
}: NameModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialValue);
      setError('');
      setSaving(false);
    }
  }, [visible, initialValue]);

  const submit = async () => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Profile name is required.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await onConfirm(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onCancel();
      }}
    >
      <KeyboardAvoidingView
        style={styles.centerBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.dialogCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.dialogSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputFill,
                borderColor: error ? colors.danger : colors.border,
                color: colors.textPrimary,
                marginTop: 12,
              },
            ]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError('');
            }}
            placeholder="Profile name"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            maxLength={32}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <View style={styles.createActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={submit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '75%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700' },
  list: { marginBottom: 4 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    minHeight: 54,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  userName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
    minHeight: 48,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  createBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  createLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  errorText: { fontSize: 12, marginTop: 6 },
  createActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700' },
  dialogSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
});
