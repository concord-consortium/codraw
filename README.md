# codraw
Collaborative Drawing Tool for use in MSU Digital Inscriptions Project.

This is a prototype collaborative drawing tool.
Use the url parameter `?firebaseKey='blah' to specifiy which collaborative group to participate in.

This project is a consumer of [drawing-tool](https://github.com/concord-consortium/drawing-tool).
Right now, the only way to update the library is to copy `drawing-tool.js` and `vendor.js` from
that project directly into the `vendor` folder.


## Working with this project ##

* `npm install -g yarn`
* `yarn`
* `webpack-dev-server`
* edit files in `src/js`
* look for changes on [localhost:8080](http://localhost:8080)


## Deploying this project ##

This project uses travis to deploy builds to `http://codraw.concord.org/branch/<branchname>/index.html`.
The production branch will deploy to `http://codraw.concord.org`

Pushing a build to github will trigger the build.
