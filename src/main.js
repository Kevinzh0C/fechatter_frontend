import { createApp } from "vue";
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import './style.css';
import App from "./App.vue";

// Routes
import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import Chat from './views/Chat.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/', 
      component: Home, 
      meta: { requiresAuth: true },
      alias: '/home'  // Add alias for /home
    },
    { 
      path: '/login', 
      component: Login,
      meta: { requiresGuest: true }  // Add meta for guest-only routes
    },
    { 
      path: '/register', 
      component: Register,
      meta: { requiresGuest: true }
    },
    { 
      path: '/chat/:id', 
      component: Chat, 
      meta: { requiresAuth: true } 
    },
  ]
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  // Redirect authenticated users away from login/register
  if (to.meta.requiresGuest && token) {
    next('/');
    return;
  }

  // Redirect unauthenticated users to login
  if (to.meta.requiresAuth && !token) {
    next('/login');
    return;
  }

  next();
});

const pinia = createPinia();
const app = createApp(App);

app.use(router);
app.use(pinia);
app.mount("#app");