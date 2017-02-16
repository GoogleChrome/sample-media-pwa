/**
 *
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const dynamic = express();
const path = require('path');
const adaro = require('adaro');
const fs = require('fs');

const libraryPath = path.join(__dirname, '..', '..', 'client', 'videos.json');
const helpersPath = path.join(__dirname, '..', 'helpers');
const filtersPath = path.join(__dirname, '..', 'filters');
const viewPath = path.join(__dirname, '..', '..', 'views');

const packageReader = require('../utils/package-reader');
const version = packageReader.getVersion();
const videoLibrary = require('../utils/video-library');
const library = videoLibrary.load(libraryPath);
const inlines = {
  js: fs.readFileSync(path.join(viewPath, 'inlines', 'bootstrap.js'), 'utf-8'),
  css: fs.readFileSync(path.join(viewPath, 'inlines', 'bootstrap.css'), 'utf-8')
};

const dustOptions = {
  cache: false,
  whitespace: true,
  helpers: [
    require(`${helpersPath}/hash`),
    require(`${helpersPath}/star-rating`),
    require(`${filtersPath}/date-format`),
    require(`${filtersPath}/time-format`),
    require(`${filtersPath}/truncate`),
    require(`${filtersPath}/linkify`),
    dust => {
      dust.helpers.gt = require('dustjs-helpers').helpers.gt;
    }
  ]
};

const defaultViewOptions = {
  title: 'Biograf',
  shows: library.shows,
  version,
  scripts: [
    'dist/client/scripts/app.js'
  ]
};

if (process.env.NODE_ENV === 'production') {
  dustOptions.cache = true;
  dustOptions.whitespace = false;
  console.log('[App: Dynamic] Templating is cached.');
}

dynamic.engine('dust', adaro.dust(dustOptions));
dynamic.set('view engine', 'dust');
dynamic.set('views', viewPath);
dynamic.use(require('../middleware/no-cache.js'));

dynamic.get('/', (req, res) => {
  // The cut-off for when new releases becomes more
  const NEW_VS_MORE = 4;
  const MAX_WATCH_MORE = 18;
  const viewOptions = Object.assign({}, defaultViewOptions, {
    featured: videoLibrary.find(library.shows, library.featured.split('/')),
    newest: videoLibrary.getNewest(library.shows, {
      count: NEW_VS_MORE,
      ignore: library.featured
    }),
    watchMore: videoLibrary.getMoreEpisodes(library.shows, {
      count: NEW_VS_MORE,
      limit: MAX_WATCH_MORE,
      ignore: library.featured
    }),
    inlines
  });

  res.status(200).render('home', viewOptions);
});

dynamic.get('/*', (req, res) => {
  // Strip off start and end slashes from the requested URL.
  const fullPath = req.url
      .replace(/(^\/|\/$)/ig, '')
      .replace(/[^a-z0-9\-\.\/]/ig, '');

  const pathParts = fullPath.split('/');
  const search = videoLibrary.find(library.shows, pathParts);
  const viewOptions = Object.assign({}, defaultViewOptions, {
    title: `Biograf - ${search.title}`,
    item: search.items,
    css: [
      'dist/client/styles/biograf.css'
    ],
    inlines: {
      js: inlines.js
    },
    fullPath
  });

  if (search.items.length === 0) {
    return res.status(400).render('404', {
      text: 'No findey'
    });
  } else if (Array.isArray(search.items)) {
    if (search.items.length === 1) {
      return res.redirect(`${search.items[0].slug}/`);
    }

    return res.status(200).render('listing', viewOptions);
  }

  res.status(200).render('video', viewOptions);
});

console.log('[App: Dynamic] initialized.');
module.exports = dynamic;
