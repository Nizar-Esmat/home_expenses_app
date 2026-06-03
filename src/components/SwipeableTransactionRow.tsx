import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAppDialog } from '@/components/AppDialog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THRESHOLD = SCREEN_WIDTH * 0.3;

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
  const [editTriggered, setEditTriggered] = useState(false);
  const { showDialog } = useAppDialog();

  const closeRow = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleSwipeableWillOpen = (direction: 'left' | 'right') => {
    if (direction === 'left') {
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
    } else {
      setEditTriggered(true);
    }
  };

  const handleSwipeableClose = () => {
    setEditTriggered(false);
  };

  useEffect(() => {
    if (editTriggered) {
      onEdit();
      closeRow();
    }
  }, [editTriggered, onEdit, closeRow]);

  const ACTION_WIDTH = 100;

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-ACTION_WIDTH, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.leftActionsContainer, { transform: [{ translateX }] }]}>
        <View style={[styles.actionButton, styles.deleteAction]}>
          <Ionicons name='trash-outline' size={28} color='#FFFFFF' />
        </View>
      </Animated.View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [ACTION_WIDTH, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightActionsContainer, { transform: [{ translateX }] }]}>
        <View style={[styles.actionButton, styles.editAction]}>
          <Ionicons name='pencil-outline' size={28} color='#FFFFFF' />
        </View>
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
      onSwipeableClose={handleSwipeableClose}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftActionsContainer: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionsContainer: {
    width: 100,
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
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteAction: {
    backgroundColor: '#DC2626',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});
