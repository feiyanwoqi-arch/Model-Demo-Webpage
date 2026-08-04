'use strict';
(() => {
  const previousRender = renderModel;
  const app = document.querySelector('.app');
  const properties = ['width', 'max-width', 'margin', 'margin-left', 'margin-right'];

  function setWide(active) {
    if (!app) return;
    if (active) {
      app.style.setProperty('width', '100vw', 'important');
      app.style.setProperty('max-width', 'none', 'important');
      app.style.setProperty('margin', '0', 'important');
      document.documentElement.style.setProperty('overflow-x', 'clip');
      document.body.style.setProperty('overflow-x', 'clip');
      return;
    }
    for (const property of properties) app.style.removeProperty(property);
    document.documentElement.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overflow-x');
  }

  renderModel = function renderR1WideLayout(id) {
    setWide(id === 'reflection-law');
    return previousRender(id);
  };
  window.renderModel = renderModel;
})();
