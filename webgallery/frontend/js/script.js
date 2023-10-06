(function () {
  "use strict";

  function onError(err) {
    console.error("[error]", err);
    let error_box = document.querySelector("#error_box");
    error_box.innerHTML = err;
    error_box.style.visibility = "visible";
    window.scrollTo(0, 0);
  }

  function resetError() {
    error_box.style.visibility = "hidden";
  }

  function updateUI() {
    let username = api.getUsername();
    document.querySelector("#signup-signin-form").style.display = username ? 'none' : 'block';
    document.querySelectorAll("#show-hide-btn, #add-img-form, #no-img-msg, #gallery-arrows, #signout_button, #salutation").forEach((e) => {
      e.style.visibility = username ? 'visible' : 'hidden';
      document.querySelector("#salutation").innerHTML = `Hello ${username}!`;
    });
    if (!username) document.querySelector("#gallery-comment").style.display = 'none';
  }

  window.onload = () => {
    let currentIndex = 0;
    let currentImage = null;
    let currentGalleryOwner = api.getUsername() || "";
    let currentGalleryPage = 0;
    
    let currentCommentPage = 0;
    let currentComments = [];

    let updateCurrentImage = () => {
      if (currentImage) {
        document.querySelector("#gallery-content").innerHTML = `
          <img id="cur-img" src=${currentImage.url} alt=${currentImage.title} />
          <div class="img-info-container">
            <div class="img-info-box">
              <p class="label">Image Title</p>
              <p class="img-info" id="cur-img-title">${currentImage.title}</p>
            </div>
            <div class="img-info-box">
              <p class="label">Author</p>
              <p class="img-info" id="cur-img-author">${currentImage.author}</p>
            </div>
          </div>`;


        document.querySelector("#gallery-comment").style.display = "block";
        document.querySelector("#no-img-msg").style.display = "none";
      } else {
        document.querySelector("#gallery-comment").style.display = "none";
        document.querySelector("#no-img-msg").style.display = "block";
      }
    };

    let setCurrentImage = (info) => {
      currentImage = info ? {title: info.title, author: info.author, imageId: info.imageId, url: `/api/images/${info.imageId}/`} : null;
    };

    let removeAllComments = () => {
      let comments = document.querySelector("#comments");
      document.querySelectorAll(".comment").forEach((elmt) => {
        comments.removeChild(elmt);
      });
    };

    let removeAllGallery = () => {
      let gallery_list = document.querySelector("#gallery-list");
      document.querySelectorAll(".gallery").forEach((elmt) => {
        gallery_list.removeChild(elmt);
      });
    };

    let addComment = (comment) => {
      let elmt = document.createElement("div");
      elmt.className = "comment";
      elmt.innerHTML = `
        <div class="main-content">
          <p class="comment-author">${comment.author}</p>
          <p class="comment-content">${comment.content}</p>
          <p class="comment-date">${comment.createdAt}</p>
        </div>
        <div class="delete-icon"></div>
      `;
      document.querySelector("#comments").append(elmt);

      elmt.querySelector(".delete-icon").addEventListener("click", (e) => {
        e.preventDefault();
        api.deleteComment(comment._id, (err) => {
          if (err) return onError(err);
          document.querySelector("#comments").removeChild(elmt);
          if (document.querySelectorAll(".comment").length === 0) {
            document.querySelector("#no-comments-msg").style.display = "block";
            document.querySelector(".comment-arrows").style.display = "none";
          }
        });
      });
    };

    let addComments = () => {
      let displayMsg = currentComments.length > 0 ? "none" : "block";
      let displayArrow = currentComments.length > 0 ? "flex" : "none";
      document.querySelector("#no-comments-msg").style.display = displayMsg;
      document.querySelector(".comment-arrows").style.display = displayArrow;
      currentComments.forEach((comment) => {
        addComment(comment);
      });
    };

    let updateComments = () => {
      if (currentImage) {
        removeAllComments();
        api.getCommentsByPage(currentImage.imageId, currentCommentPage, (err, cmts) => {
          if (err) return onError(err);
          currentComments = cmts;
          addComments();
        });
      }
    };

    let initialization = () => {
      if (currentGalleryOwner) {
        api.getCurrentImage(currentIndex, currentGalleryOwner, (err, info) => {
          if (err) {
            onError(err);
          } else {
            setCurrentImage(info);
          }
          updateCurrentImage();
    
          if (currentImage) {
            api.getCommentsByPage(currentImage.imageId, currentCommentPage, (err, cmts) => {
              if (err) onError(err);
              else {
                currentComments = cmts;
                updateComments();
              }
            });
          }
        });
      }
    };

    let initializeGalleryList = () => {
      if (api.getUsername()) {
        // Remove all to avoid redundancy
        removeAllGallery();

        api.getUsernames(currentGalleryPage, (err, usernames) => {
          if (err) return onError(err);
          usernames.forEach((username) => {
            let elmt = document.createElement("div");
            elmt.className = "gallery";
            elmt.innerHTML = `<div>${username}'s Gallery</div>`;
            document.querySelector("#gallery-list").append(elmt);
    
            elmt.addEventListener("click", (e) => {
              e.preventDefault();
              currentGalleryOwner = username;
              currentIndex = 0;
              currentCommentPage = 0;
              initialization();
            });
          });
        });
      }
    };

    function submit() {
      resetError();
      if (document.querySelector("#signup-signin-form").checkValidity()) {
        var username = document.querySelector("form [name=username]").value;
        var password = document.querySelector("form [name=password]").value;
        var action = document.querySelector("form [name=action]").value;
        api[action](username, password, function (err, username) {
          if (err) return onError(err);
          document.querySelector("#signup-signin-form").reset();
          currentGalleryOwner = username;
          currentIndex = 0;
          currentImage = null;
          currentGalleryPage = 0;
          currentCommentPage = 0;
          currentComments = [];
          updateUI();
          initializeGalleryList();
          initialization();
        });
      }
    }

    document.getElementById("show-hide-btn").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();

      let elmt = document.getElementById("add-img-form");
      let btn = document.getElementById("show-hide-btn");

      if (elmt.style.display === "block") {
        elmt.style.display = "none";
        btn.innerHTML = "Show Add Image Form";
      } else {
        elmt.style.display = "block";
        btn.innerHTML = "Hide Add Image Form";
      }
    });

    document.getElementById("add-img-form").addEventListener("submit", (e) => {
      e.preventDefault();
      resetError();
      let title = document.getElementById("img-title").value;
      let file = document.getElementById("picture").files[0];
      document.getElementById("add-img-form").reset();

      api.addImage(title, file, (err) => {
        if (err) return onError(err);

        currentIndex = 0;
        currentGalleryOwner = api.getUsername();
        api.getCurrentImage(currentIndex, currentGalleryOwner, (err, info) => {
          if (err) return onError(err);
          setCurrentImage(info);
          updateCurrentImage();
          currentCommentPage = 0;
          updateComments();
        });
      });
    });

    document.getElementById("delete-btn").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      api.deleteImage(currentImage.imageId, (err) => {
        if (err) return onError(err);

        api.getCurrentImage(currentIndex, currentGalleryOwner, (err, info) => {
          if (err) return onError(err);
          if (info) {
            setCurrentImage(info);
            updateCurrentImage();
            currentCommentPage = 0;
            updateComments();
          } else if (currentIndex - 1 >= 0) {
            api.getCurrentImage(currentIndex - 1, currentGalleryOwner, (err, info) => {
              if (err) return onError(err);
              if (info) {
                currentIndex = currentIndex - 1;
                setCurrentImage(info);
              } else {
                currentIndex = 0;
                currentImage = null;
              }
              updateCurrentImage();
              currentCommentPage = 0;
              updateComments();
            });
          } else {
            // image collection is empty
            currentIndex = 0;
            currentImage = null;
            updateCurrentImage();
          }
        });
      });

      
    });

    document.querySelector(".prev-arrow").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      currentIndex = Math.max(0, currentIndex - 1);
      api.getCurrentImage(currentIndex, currentGalleryOwner, (err, info) => {
        if (err) return onError(err);
        if (info) {
          setCurrentImage(info);
          updateCurrentImage();
          currentCommentPage = 0;
          updateComments();
        }
        
      });
      
    });

    document.querySelector(".next-arrow").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      api.getCurrentImage(currentIndex + 1, currentGalleryOwner, (err, info) => {
        if (err) return onError(err);
        if (info) {
          currentIndex = currentIndex + 1;
          setCurrentImage(info);
          updateCurrentImage();

          currentCommentPage = 0;
          updateComments();
        }
      });
    });

    document
      .querySelector("#add-comment-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        resetError();
        let comment = document.querySelector("#comment").value;
        document.querySelector("#add-comment-form").reset();
        api.addComment(currentImage.imageId, comment, (err) => {
          if (err) return onError(err);
          updateComments();
        });
      });

    document.querySelector(".prev-comment").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      if (currentCommentPage > 0) {
        currentCommentPage = currentCommentPage - 1;
        updateComments();
      }
    });

    document.querySelector(".next-comment").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      api.getCommentsByPage(currentImage.imageId, currentCommentPage + 1, (err, cmts) => {
        if (err) onError(err);
        if (cmts.length > 0) {
          currentCommentPage = currentCommentPage + 1;
          updateComments();
        }
      });
    });

    document.querySelector("#prev-gallery").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      if (currentGalleryPage > 0) {
        currentGalleryPage = currentGalleryPage - 1;
        initializeGalleryList();
      }
    });

    document.querySelector("#next-gallery").addEventListener("click", (e) => {
      e.preventDefault();
      resetError();
      api.getUsernames(currentGalleryPage + 1, (err, usernames) => {
        if (err) onError(err);
        if (usernames.length > 0) {
          currentGalleryPage = currentGalleryPage + 1;
          initializeGalleryList();
        }
      });
    });

    document.querySelector("#signin").addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector("form [name=action]").value = "signin";
      submit();
    });

    document.querySelector("#signup").addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector("form [name=action]").value = "signup";
      submit();
    });

    document.querySelector("#signup-signin-form").addEventListener("submit", function (e) {
      e.preventDefault();
      updateUI();
    });

    document.querySelector("#signout_button").addEventListener("click", (e) => {
      e.preventDefault();
      api.signout(() => {
        updateUI();
        removeAllGallery();
      });
    });

    updateUI();

    if (api.getUsername()) {
      initializeGalleryList();
      initialization();
    }
  };
})();
