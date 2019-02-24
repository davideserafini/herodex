'use strict'

function bindStaticLinks() {
  document.querySelectorAll('#menus-wrapper a[href *= "/marvel/"]').forEach(link => bindLink(link));
}
function bindContentLinks() {
  document.querySelectorAll('#content a[href *= "/marvel/"]').forEach(link => bindLink(link));
}
function bindLink(link) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const urlToLoad = new URL(link.href).pathname;
    updateUrl(urlToLoad);
    updateContent(urlToLoad);
  });
}

function updateUrl(urlToLoad) {
  history.pushState({}, '', urlToLoad);
}

function updateContent(urlToLoad) {
  if (urlToLoad.endsWith('.html')) {
    urlToLoad = urlToLoad.replace('html', 'json');
  } else if (urlToLoad === '/') {
    urlToLoad = '/index.json';
  }
  fetch(urlToLoad, { headers: { "Content-type": "application/json" }})
    .then(response => {
      console.log(response);
      response.json().then(data => {
        document.title = data.title;
        document.getElementById('content').innerHTML = data.body;
        const loadEvent = new Event('contentLoaded');
        document.dispatchEvent(loadEvent);
      });
    });
}

function loadContent() {
  console.log('loadContent');
  if (document.getElementById('content').hasAttribute('data-load-content')) {
    console.log('loadContent true');
    const urlToLoad = window.location.pathname;
    updateContent(urlToLoad);
  } else {
    console.log('loadContent false');
    const loadEvent = new Event('contentLoaded');
    document.dispatchEvent(loadEvent);
  }
}

document.addEventListener('DOMContentLoaded', bindStaticLinks);
document.addEventListener('DOMContentLoaded', loadContent);
document.addEventListener('contentLoaded', bindContentLinks);
