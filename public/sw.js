const articleCacheName = 'herodex-article-cache';
const imageCacheName = 'herodex-image-cache';
const appCacheName = 'herodex-app-cache';
const urlsToCache = [
  '/css/main.css',
  '/js/main.js',
  '/site-shell.html'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(appCacheName)
      .then(function (cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  console.log('trying to fetch ' + event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('cache hit for ' + event.request.url);
          return response;
        }

        // If it's a request for image or json, check if it's in the cache,
        // otherwise fetch and save it
        if (event.request.url.indexOf('.jpg') > -1 || 
            event.request.url.indexOf('.json') > -1) {
          return fetchAndCache(event);
        }
        // If it's an html file, this is something we can enhance
        // Return immediately the site shell, and then fire an event to load the content
        const requestUrl = new URL(event.request.url);
        if (event.request.url.indexOf('.html') > -1 || requestUrl.pathname === '/') {
          return caches.match('/site-shell.html')
            .then(response => {
              console.log('returning site-shell.html for ' + event.request.url);
              return response;
            })
        }

        // In all the other cases, proceed without doing anything
        console.log('fetch only ' + event.request.url);
        return fetch(event.request);
      })
  );
});

function fetchAndCache(event) {
  console.log('fetch and cache ', event.request.url);
  return fetch(event.request).then(
    function (response) {
      // Check if we received a valid response
      if (!response || response.status !== 200 || response.type !== 'basic') {
        console.log('strange response ' + response);
        return response;
      }

      let cacheName;
      if (response.headers.get('content-type').indexOf('image') > -1) {
        cacheName = imageCacheName;
      } else if (response.headers.get('content-type').indexOf('json') > -1) {
        cacheName = articleCacheName;
      }
      console.log('chosen cache' + cacheName + ' for ' + response.url);

      if (cacheName) {
        // IMPORTANT: Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams.
        const responseToCache = response.clone();
        caches.open(cacheName)
        .then(function (cache) {
          cache.put(event.request, responseToCache);
        });
      }

      return response;
    }
  );
}