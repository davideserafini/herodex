'use strict'

function bindStaticLinks() {
  document.querySelectorAll('#menus-wrapper a').forEach(link => bindLink(link));
}
function bindContentLinks() {
  document.querySelectorAll('#content a').forEach(link => bindLink(link));
}
function bindLink(link) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const urlToLoad = new URL(link.href).pathname;
    updateContent(urlToLoad);
    updateUrl(urlToLoad);
  });
}

function updateUrl(urlToLoad) {
  history.pushState({}, '', urlToLoad);
}

async function updateContent(urlToLoad) {
  if (urlToLoad.endsWith('.html')) {
    urlToLoad = urlToLoad.replace('.html', '-content.part.html');
  } else if (urlToLoad === '/') {
    urlToLoad = '/index-content.part.html';
  }

  const response = await fetch(urlToLoad);
  const htmlContent = await response.text();
  document.getElementById('content').innerHTML = htmlContent;
  bindContentLinks();
}

document.addEventListener('DOMContentLoaded', bindStaticLinks);
document.addEventListener('DOMContentLoaded', bindContentLinks);
