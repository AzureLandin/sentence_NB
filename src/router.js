import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.vue'),
  },
  {
    path: '/text-input',
    name: 'TextInput',
    component: () => import('./views/TextInput.vue'),
  },
  {
    path: '/photo-input',
    name: 'PhotoInput',
    component: () => import('./views/PhotoInput.vue'),
  },
  {
    path: '/collection',
    name: 'Collection',
    component: () => import('./views/Collection.vue'),
  },
  {
    path: '/sentence/:id',
    name: 'SentenceDetail',
    component: () => import('./views/SentenceDetail.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./views/Settings.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
