![](https://api.travis-ci.org/victorsavu3/parceive-ui.svg?branch=master)

Install
=======

Global
------

1. Install Node.js
https://nodejs.org/
2. Install Chrome LiveReload extention
https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=en
3. Install bower and gulp

    ```
    npm install -g bower gulp
    ```

In the project folder
---------------------

    npm install

Running
=======

Starting the server
-------------------

    gulp

The server is now available on port 8080. LiveReload is enabled so restart should never be required.

Only building
-------------

    gulp build

Release
-------

    gulp build --minify true --sourcemaps false

Developing
==========

Dependencies
------------

Add dependencies to `bower.json` and they will be automatically installed.
`build.json` contains the ordered lists of javascript and css files that are actually added to the build.

Views
-----

Add views to the view folder and name the module `<file>-view`. It will be added automagically.

Linting
-------

`jshint` and `csslint` are activated by default and are run during the build process.
