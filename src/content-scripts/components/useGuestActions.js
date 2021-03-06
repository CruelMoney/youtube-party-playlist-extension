import { useEffect, useCallback, useState } from "react";
import { useMutation } from "@apollo/client";
import { UPDATE_PLAYLIST, ADD_TRACK } from "../../gql";
import { ToastsStore } from "react-toasts";

const useGuestActions = ({ playlist, userId }) => {
  const {
    id,
    tracks = [],
    currentIndex,
    currentSongStartedTimestamp,
    currentSongPlaybackSecond,
    admin,
  } = playlist || {};

  const currentTrack = tracks[currentIndex];

  const { notOnPartyUrl } = useAddHandlersToButtons({
    id,
    userId,
    currentTrack,
  });

  // update player to current playback state
  useEffect(() => {
    const video = document.querySelector("video");
    let hasUpdated = false;

    if (video) {
      const updateToCurrentTime = ({ initial }) => {
        if (!admin && video && currentSongStartedTimestamp && !hasUpdated) {
          // we need to caluclate the current position
          const diffSeconds =
            (new Date().getTime() - currentSongStartedTimestamp) / 1000;
          const currentPosition = currentSongPlaybackSecond + diffSeconds;

          video.currentTime = currentPosition;

          if (!initial) {
            hasUpdated = true;
          }
        }
      };

      // we call it again here to perfect it after a load
      video.addEventListener("playing", updateToCurrentTime);
      updateToCurrentTime({ initial: true });

      return () => video.removeEventListener("playing", updateToCurrentTime);
    }
  }, [currentSongPlaybackSecond, currentSongStartedTimestamp, admin]);

  return { notOnPartyUrl };
};

const getNodeTrackTitle = (node) => {
  const parent = node.closest("#dismissable") || node.closest("#content");
  if (parent) {
    const titleNode =
      parent.querySelector("#video-title") ||
      parent.querySelector("#video-title-link");
    if (titleNode) {
      return titleNode.innerText;
    }
  }

  return null;
};

const getNodeTrackUrl = (node) => {
  const parent = node.closest("#dismissable") || node.closest("#content");
  if (parent) {
    const urlNode = parent.querySelector("[href^='/watch']");
    if (urlNode) {
      let urlObject = new URL("https://www.youtube.com" + urlNode.href);
      const videoId = urlObject.searchParams.get("v");
      urlObject = new URL("https://www.youtube.com/watch");
      urlObject.searchParams.set("v", videoId);
      return urlObject.href;
    }
  }

  return null;
};

const useAddHandlersToButtons = ({ id, userId, currentTrack }) => {
  const [notOnPartyUrl, setNotInParty] = useState();

  const [addTrack] = useMutation(ADD_TRACK, {
    onError: (error) => {
      console.log(error);
      ToastsStore.error("Something went wrong");
    },
    onCompleted: () => ToastsStore.success("Added track"),
  });

  const addListenersToRoot = useCallback(() => {
    forceTheaterMode();

    const nodes = document.querySelectorAll("#metadata");

    nodes.forEach((node) => {
      const url = getNodeTrackUrl(node);

      if (url) {
        let hasButton = node.parentElement.querySelector(".add-track-button");
        const name = getNodeTrackTitle(node);

        if (!hasButton) {
          const button = document.createElement("button");
          button.className = "add-track-button secondary-button";
          button.innerText = "Add to party playlist";
          button.setAttribute("data-url", url);
          node.parentElement.appendChild(button);
          hasButton = button;
        }
        hasButton.onclick = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();

          addTrack({
            variables: {
              id,
              url,
              name,
              user: userId,
            },
          });
        };
      }
    });
  }, [id, addTrack, userId]);

  // add listeners to addd track buttons
  useEffect(() => {
    const observer = new MutationObserver(addListenersToRoot);
    const addListeners = () => {
      observer.observe(document.body, { childList: true, subtree: true });
      const isNotInParty =
        currentTrack?.url && window.location.href !== currentTrack.url;
      setNotInParty(isNotInParty);
    };
    addListeners();
    addListenersToRoot();

    return () => {
      observer.disconnect();
    };
  }, [addListenersToRoot, currentTrack]);

  return { notOnPartyUrl };
};

let hasResized = false;

const forceTheaterMode = () => {
  const player = document.querySelector("ytd-watch-flexy");

  if (player) {
    const button = player.querySelector(".ytp-size-button");
    if (button) {
      const theaterRequested = player.getAttribute("theater-requested_");
      if (theaterRequested === null || !hasResized) {
        button.click();
        hasResized = true;
      }
    }
  }
};

export default useGuestActions;
