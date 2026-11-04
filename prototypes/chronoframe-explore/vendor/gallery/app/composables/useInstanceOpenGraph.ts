import type { ComputedRef } from 'vue'
export async function useInstanceOpenGraph(_photos: ComputedRef<Photo[]>) {
  useSeoMeta({ description: 'KAMITSUBAKI Wiki 公开影像探索馆', ogTitle: '神椿影像馆', ogDescription: '从另一种视角，遇见神椿。' })
}
