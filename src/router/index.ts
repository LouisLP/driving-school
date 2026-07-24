import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    /**
     * PROTOTYPE — throwaway, for
     * [Planner calendar UX (#11)](https://github.com/LouisLP/driving-school/issues/11).
     * Leaves with the prototype; the real planner route arrives with the app shell (#7).
     */
    {
      path: '/prototype/planner',
      name: 'prototype-planner',
      component: () => import('@/features/planner/prototype/PlannerPrototypeView.vue'),
    },
  ],
})

export default router
