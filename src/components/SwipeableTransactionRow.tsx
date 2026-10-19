import React, { useRef, useCallback } from 'react';
import { StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAppDialog } from '@/components/AppDialog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THRESHOLD = SCREEN_WIDTH * 0.35;
const ACTION_WIDTH = 90;

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export default function SwipeableTransactionRow({
  onEdit,
  onDelete,
  children,
}: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const { showDialog } = useAppDialog();

  const closeRow = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const confirmDelete = useCallback(() => {
    showDialog({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: closeRow },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            closeRow();
          },
        },
      ],
    });
  }, [showDialog, onDelete, closeRow]);

  const handleEditPress = useCallback(() => {
    closeRow();
    onEdit();
  }, [closeRow, onEdit]);

  const handleSwipeableWillOpen = (direction: 'left' | 'right') => {
    // Standard mobile ergonomics:
    // Swiping right-to-left (direction === 'right') reveals Delete action on the right
    if (direction === 'right') {
      confirmDelete();
    }
  };

  // Revealed when swiping left-to-right (from left): EDIT (Non-destructive)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-ACTION_WIDTH, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actionsContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editAction]}
          onPress={handleEditPress}
          accessibilityRole="button"
          accessibilityLabel="Edit transaction"
        >
          <Ionicons name='pencil-outline' size={26} color='#FFFFFF' />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Revealed when swiping right-to-left (from right): DELETE (Destructive)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [ACTION_WIDTH, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actionsContainer, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteAction]}
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
        >
          <Ionicons name='trash-outline' size={26} color='#FFFFFF' />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={THRESHOLD}
      rightThreshold={THRESHOLD}
      onSwipeableWillOpen={handleSwipeableWillOpen}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAction: {
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteAction: {
    backgroundColor: '#DC2626',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});
