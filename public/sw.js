const articleCacheName = 'herodex-article-cache';
const imageCacheName = 'herodex-image-cache';
const appCacheName = 'herodex-app-cache-v2';
const urlsToCache = [
  '/css/main.css',
  '/js/main.js',
  '/site-shell-top.part.html',
  '/site-shell-bottom.part.html',
  '/404.html',
  '/offline.html',
  '/offline-content.part.html',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    precache(urlsToCache)
  );
});
/**
 * Precache list of assets 
 * @param {array} assetsToCache 
 */
async function precache(assetsToCache) {
  const cache = await caches.open(appCacheName).catch((err) => { throw err });
  return cache.addAll(assetsToCache);
}



self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Delete older version of herodex-app-cache by returning true
          return cacheName.includes('herodex-app-cache') && cacheName !== appCacheName;
        }).map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const pathname = requestUrl.pathname;

  if (urlsToCache.includes(pathname)) {
    /* CACHE ONLY STRATEGY for elements cached during the install event */
    console.log('CACHE ONLY ' + pathname);
    event.respondWith(
      fromCache(event.request.url)
    );
  } else if(pathname.endsWith('.jpg') ||
            pathname.endsWith('.png') ||
            pathname.endsWith('.gif')) {
    /* CACHE FALLING BACK TO NETWORK for content images.
        We can suppose these are in cache after the first load, and will stay unchanged.
        If an image is changed, it wil have a new url */
    console.log('CACHE FALLING BACK TO NETWORK ' + pathname);
    event.respondWith(
      fromCache(event.request.url)
        .then(function(response) {
          return response || fromNetwork(event.request.url, true);
      })
    );
  } else if(pathname.endsWith('-content.part.html')) {
    /* NETWORK FALLING BACK TO CACHE for page content */
    console.log('NETWORK FALLING BACK TO CACHE ' + pathname);
    event.respondWith(
      fromNetwork(event.request.url, true)
        .catch(function() {
          return fromCache(event.request.url)
            .then(function(response) {
              return response || fromCache('/offline-content.part.html');
            });
        })
      );
  } else if(pathname.endsWith('.html') || 
            pathname === '/') {
    /* SITE SHELL + Content */
    console.log('SITE SHELL + Content ' + pathname);
    event.respondWith(async function(){
      if (pathname.endsWith('.html')) {
        requestUrl.pathname = requestUrl.pathname.replace('.html', '-content.part.html');
      } else {
        requestUrl.pathname = '/index-content.part.html';
      }
      const parts = [
        fromCache('/site-shell-top.part.html'),
        fromNetwork(requestUrl, true)
          .catch(function(err){
            console.log('err ', err);
            return fromCache(requestUrl)
              .then(function(response){
                return response || fromCache('/offline-content.part.html');
              });
          }),
        fromCache('/site-shell-bottom.part.html')
      ];

      // Merge them all together.
      const { done, response } = await mergeResponses(parts);
      // Wait until the stream is complete.
      event.waitUntil(done);
      // Return the merged response.
      return response;
    }());
  }
});


/**
 * Gets an element from the cache
 * 
 * @param {object} request 
 */
async function fromCache(request) {
  console.log(`[fromCache] Retrieving ${request} from cache`);
  // caches is a CacheStorage and caches.match is a convenient method that searches in every cache
  const cachedResponse = await caches.match(request);
  console.log(`[fromCache] cached response for ${request} is `, cachedResponse);
  return cachedResponse;
}

/**
 * Gets an element from the network
 * 
 * @param {object} request 
 */
async function fromNetwork(request, addToCache) {
  console.log(`[fromNetwork] Fetching ${request} from network`);
  const response = await fetch(request);
  
  if(addToCache) {
    // response.clone() is needed because the body can only be read once
    const response2 = response.clone();
    await updateCacheFromNetwork(request, response2);
  }

  return response;
}

/**
 * Fetches an element and save the response to the cache
 * 
 * @param {object} request 
 */
async function updateCacheFromNetwork(request, response) {
  // Check if we received a valid response
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return Promise.reject('Fetch error');
  }

  let cacheName;
  if (response.headers.get('content-type').includes('image')) {
    cacheName = imageCacheName;
  } else if (response.url.endsWith('-content.part.html')) {
    cacheName = articleCacheName;
  }
  console.log('chosen cache ' + cacheName + ' for ' + response.url);

  const cache = await caches.open(cacheName);
  return cache.put(request, response);
}

// Credits to Jake Archibald for this https://gist.github.com/jakearchibald/d0b7e65496a8ec362f10739c3e28da6e#file-future-js
async function mergeResponses(responsePromises, headers) {
  const {readable, writable} = new TransformStream();
  
  const done = (async function() {
    for await (const response of responsePromises) {
      await response.body.pipeTo(writable, {preventClose: true});
    }
    writable.getWriter().close();
  })();

  return {
    done,
    response: new Response(readable, {
      headers: headers || (await responsePromises[0]).headers
    })
  };
}