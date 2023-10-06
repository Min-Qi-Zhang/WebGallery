var api = (function () {
  "use strict";

  function sendFiles(method, url, data, callback) {
    let formdata = new FormData();
    Object.keys(data).forEach(function (key) {
      let value = data[key];
      formdata.append(key, value);
    });
    let xhr = new XMLHttpRequest();
    xhr.onload = function () {
      if (xhr.status !== 200)
        callback("[" + xhr.status + "]" + xhr.responseText, null);
      else callback(null, JSON.parse(xhr.responseText));
    };
    xhr.open(method, url, true);
    xhr.send(formdata);
  }

  function send(method, url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      if (xhr.status !== 200)
        callback("[" + xhr.status + "]" + xhr.responseText, null);
      else callback(null, JSON.parse(xhr.responseText));
    };
    xhr.open(method, url, true);
    if (!data) xhr.send();
    else {
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(data));
    }
  }

  var module = {};

  /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) _id 
            - (String) title
            - (String) author
            - (Date) date
    
        comment objects must have the following attributes
            - (String) _id
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */

  module.getUsername = function () {
    return document.cookie.replace(
      /(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/,
      "$1"
    );
  };

  module.getUsernames = function (page, callback) {
    send("GET", `/api/users/?page=${page}/`, null, callback);
  };

  module.signup = function (username, password, callback) {
    send("POST", "/signup/", { username, password }, callback);
  };

  module.signin = function (username, password, callback) {
    send("POST", "/signin/", { username, password }, callback);
  };

  module.signout = function (callback) {
    send("GET", "/signout/", null, callback);
  };

  // add an image to the gallery
  module.addImage = function (title, file, callback) {
    sendFiles("POST", "/api/images/", { title, file }, (err, res) => {
      if (err) return callback(err);
      else return callback(null);
    });
  };

  // delete an image from the gallery given its imageId
  module.deleteImage = function (imageId, callback) {
    send("DELETE", `/api/images/${imageId}/`, null, (err, res) => {
      if (err) return callback(err);
      else return callback(null);
    });
  };

  module.getCurrentImage = function (index, username, callback) {
    send("GET", `/api/images/${index}/${username}/info/`, null, callback);
  };

  // add a comment to an image
  module.addComment = function (imageId, content, callback) {
    send("POST", "/api/comments/", { imageId, content }, (err, res) => {
      if (err) return callback(err);
      else return callback(null);
    });
  };

  // delete a comment to an image
  module.deleteComment = function (commentId, callback) {
    send("DELETE", `/api/comments/${commentId}/`, null, (err, res) => {
      if (err) return callback(err);
      else return callback(null);
    });
  };

  // return 10 comments given the imageId and page number
  module.getCommentsByPage = function (imageId, page, callback) {
    send(
      "GET",
      `/api/comments/?imageId=${imageId}&page=${page}/`,
      null,
      callback
    );
  };

  return module;
})();
