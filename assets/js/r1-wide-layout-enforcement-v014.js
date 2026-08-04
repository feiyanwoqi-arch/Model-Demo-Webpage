'use strict';
(() => {
  const previousRender = renderModel;
  const app = document.querySelector('.app');
  const view = document.querySelector('#view');
  const properties = ['width', 'max-width', 'margin', 'margin-left', 'margin-right'];

  function setProperties(node, values) {
    if (!node) return;
    for (const [property, value] of Object.entries(values)) node.style.setProperty(property, value, 'important');
  }

  function clearProperties(node) {
    if (!node) return;
    for (const property of properties) node.style.removeProperty(property);
  }

  function setWide(active) {
    if (active) {
      setProperties(app, { width: '100vw', 'max-width': 'none', margin: '0' });
      setProperties(view, { width: '100%', 'max-width': 'none', margin: '0' });
      view?.classList.add('r1-v014-mounted');
      document.documentElement.style.setProperty('overflow-x', 'clip');
      document.body.style.setProperty('overflow-x', 'clip');
      return;
    }
    clearProperties(app);
    clearProperties(view);
    view?.classList.remove('r1-v014-mounted');
    document.documentElement.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overflow-x');
  }

  renderModel = function renderR1WideLayout(id) {
    setWide(id === 'reflection-law');
    return previousRender(id);
  };
  window.renderModel = renderModel;
})();
