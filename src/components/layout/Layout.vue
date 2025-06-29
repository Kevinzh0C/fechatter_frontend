<template>
  <div class="layout-container">
    <aside class="layout-sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="layout-main">
      <slot />
    </main>
  </div>
</template>

<script>
export default {
  name: 'Layout'
};
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  background: var(--color-background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  transition: background-color 0.3s ease;
}

/* Golden Ratio Responsive Breakpoints */
@media (max-width: 1200px) {
  .layout-sidebar {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .layout-sidebar {
    width: 280px;
    position: absolute;
    left: -100%;
    z-index: 1000;
    height: 100%;
    transition: left 0.3s ease;
  }
  
  .layout-sidebar.mobile-open {
    left: 0;
  }
  
  .layout-main {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .layout-sidebar {
    width: 100%;
  }
}

.layout-sidebar {
  /* Golden ratio: 1 / (1 + φ) ≈ 0.382 */
  width: 38.2%;
  max-width: 320px;
  min-width: 240px;
  background: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: background-color 0.3s ease, color 0.3s ease, width 0.3s ease;
}

.layout-main {
  /* Golden ratio: φ / (1 + φ) ≈ 0.618 */
  flex: 1;
  width: 61.8%;
  overflow: auto;
  position: relative;
  background: var(--color-background);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Golden Ratio Visual Enhancements */
.layout-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 38.2%;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-sidebar-border) 20%,
    var(--color-sidebar-border) 80%,
    transparent 100%
  );
  z-index: 1;
  pointer-events: none;
  opacity: 0.3;
}

@media (max-width: 768px) {
  .layout-container::before {
    display: none;
  }
}
</style>