import { useEffect } from "react";
import { useMutation } from "@apollo/client";
import { UPDATE_PLAYLIST } from "../../gql";

const useAdminActions = ({ party }) => {
  const [updatePlaylist, { error }] = useMutation(UPDATE_PLAYLIST);
  const { id, admin } = party || {};
  console.log({ error, id });

  useEffect(() => {
    if (admin && id) {
      const video = document.querySelector("video");
      video.addEventListener("seeked", (event) => {
        const currentSongStartedTimestamp = Date.now();
        const currentSongPlaybackSecond = parseInt(video.currentTime);
        console.log({
          id,
          currentSongStartedTimestamp,
          currentSongPlaybackSecond,
        });

        updatePlaylist({
          variables: {
            id,
            currentSongStartedTimestamp,
            currentSongPlaybackSecond,
          },
        });
      });
    }
  }, [id, admin]);
};

export default useAdminActions;
