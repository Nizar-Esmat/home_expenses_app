let currentDirection: 'left' | 'right' = 'right';
let hasNewDirection = false;

export function setTabSlideDirection(fromIndex: number, toIndex: number) {
  currentDirection = toIndex > fromIndex ? 'right' : 'left';
  hasNewDirection = true;
}

export function getTabSlideDirection(): 'left' | 'right' | null {
  if (!hasNewDirection) return null;
  hasNewDirection = false;
  return currentDirection;
}
