import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import MainLayout from '@/layouts/MainLayout.vue';

const Home = () => import('@/views/Home.vue');
const Login = () => import('@/views/Login.vue');
const Register = () => import('@/views/Register.vue');
const Chat = () => import('@/views/Chat.vue');
const UserSettings = () => import('@/views/UserSettings.vue');

const routes = [
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: Home,
      },
      {
        path: 'chat/:id',
        name: 'Chat',
        component: Chat,
      },
      {
        path: 'settings',
        name: 'UserSettings',
        component: UserSettings,
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest);

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (requiresGuest && authStore.isAuthenticated) {
    next('/home');
  } else {
    next();
  }
});

export default router;