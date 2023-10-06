(function () {
  "use strict";

  window.addEventListener("load", function () {
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

    let updateUI = () => {
      let username = api.getUsername();
      document.querySelector("#signup-signin-form").style.display = username ? 'none' : 'block';
      document.querySelectorAll("#gallery-comment, #show-hide-btn, #add-img-form, #no-img-msg").forEach((e) => {
        e.style.visibility = username ? 'visible' : 'hidden';
      });
      document.querySelector("#signout_button").style.visibility = username ? 'visible' : 'hidden';
    };

    function submit() {
      resetError();
      if (document.querySelector("form").checkValidity()) {
        var username = document.querySelector("form [name=username]").value;
        var password = document.querySelector("form [name=password]").value;
        var action = document.querySelector("form [name=action]").value;
        api[action](username, password, function (err, username) {
          if (err) return onError(err);
          updateUI();
        });
      }
    }

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
      });
    });

    updateUI();
  });
})();
