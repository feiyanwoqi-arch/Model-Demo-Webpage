'use strict';
function renderRoute(){const h=decodeURIComponent(location.hash.slice(1)||'home');if(h==='home')renderHome();else if(h.startsWith('category:'))renderCategory(h.split(':')[1]);else if(h.startsWith('model:'))renderModel(h.split(':')[1]);else renderHome();window.scrollTo({top:0,behavior:'instant'})}
window.addEventListener('hashchange',renderRoute);renderRoute();
