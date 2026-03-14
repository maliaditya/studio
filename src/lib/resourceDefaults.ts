import type { Resource, ResourcePoint } from '@/types/workout';

export const createDefaultTextPoint = (text = 'Type something...'): ResourcePoint => ({
  id: `point_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  text,
  type: 'text',
});

export const buildDefaultPointsForResourceType = (
  type: Resource['type'],
  existingPoints?: ResourcePoint[]
): ResourcePoint[] | undefined => {
  if (existingPoints && existingPoints.length > 0) {
    return existingPoints;
  }

  if (type === 'card') {
    return [createDefaultTextPoint()];
  }

  return existingPoints;
};
