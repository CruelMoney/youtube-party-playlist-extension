import React, { useEffect, useState, useRef } from "react";
import ConnectBackend from "../../ConnectBackend";
import { useMutation, useSubscription, useQuery } from "@apollo/client";
import {
  JOIN_PARTY,
  PLAYLIST_UPDATED,
  REMOVE_TRACK,
  VOTE,
  REMOVE_VOTE,
  PLAYLIST,
} from "../../gql";
import useAdminActions from "./useAdminActions";
import useGuestActions from "./useGuestActions";
import UsersSection from "./UsersSection";

const SideBar = ({ party }) => {
  let { data } = useQuery(PLAYLIST, { variables: { id: party.playlist.id } });
  const { data: subscriptionData } = useSubscription(PLAYLIST_UPDATED, {
    variables: { id: party.playlist.id },
  });

  const { user, admin } = party;
  data = {
    ...data,
    ...subscriptionData,
  };
  const playlist = data?.playlist;

  useAdminActions({ playlist, admin });
  useGuestActions({ playlist });

  if (!playlist) {
    return null;
  }

  const { tracks = [], id, url, currentIndex, users = [] } = playlist;

  const currentTrack = tracks[currentIndex];
  const upcomingTracks = tracks.slice(currentIndex + 1);

  return (
    <div id={"side-bar-content"}>
      <div className="top-area section">
        <h1>YouTube Party</h1>
        <LeavePartyButton />
        <label>
          Invitation link
          <input value={url} />
        </label>
      </div>

      <UsersSection users={users} />

      {currentTrack && (
        <div className="section with-border ">
          <h2>Now playing:</h2>
          <CurrentTrack {...currentTrack}></CurrentTrack>
        </div>
      )}

      {upcomingTracks?.length ? (
        <NextUpSection
          user={user}
          admin={admin}
          tracks={upcomingTracks}
          playlistId={id}
        />
      ) : (
        <EmptyPlaylist />
      )}
      <CreatedBySection />
    </div>
  );
};

const LeavePartyButton = () => {
  const leaveParty = () => {
    chrome.runtime.sendMessage({
      type: "LEAVE_PARTY",
    });
  };

  return (
    <button className="secondary-button" onClick={leaveParty}>
      Leave party
    </button>
  );
};

const NextUpSection = ({ ...props }) => {
  return (
    <div className="section with-border next-up-wrapper">
      <h2>Up next:</h2>
      <div className=" next-up">
        <Tracks {...props} />
      </div>
    </div>
  );
};

const CreatedBySection = ({ ...props }) => {
  return (
    <div className="created-by">
      <a className="row" href="https://twitter.com/ChrisDengso">
        <p>By Christopher Dengsø</p>
        <img
          src={
            "https://pbs.twimg.com/profile_images/1210274375565500416/dC60WJnl_reasonably_small.jpg"
          }
        ></img>
      </a>
    </div>
  );
};

const EmptyPlaylist = () => {
  const imgUrl = chrome.runtime.getURL("images/howto.png");
  return (
    <div className="section empty-playlist">
      <p>
        No tracks added to the playlist. Add more tracks by clicking on the
        action button nect to a video.
      </p>
      <img src={imgUrl} />
    </div>
  );
};

const UpvoteButton = ({ votes, hasVoted, ...props }) => {
  return (
    <button
      className={"upvote-button " + (hasVoted ? " active " : "")}
      {...props}
    >
      <span className="up-arrow" />
      <span>{votes?.length || 0}</span>
    </button>
  );
};

const Tracks = ({ tracks, user, playlistId, admin }) => {
  return (
    <ul>
      {tracks.map((t) => (
        <Track
          key={t.id}
          playlistId={playlistId}
          user={user}
          admin={admin}
          {...t}
        />
      ))}
    </ul>
  );
};

const Track = ({ playlistId, url, id, votes, name, user, admin, ...props }) => {
  const [remove] = useMutation(REMOVE_TRACK, {
    variables: { id, playlistId },
  });
  const [vote] = useMutation(VOTE, {
    variables: {
      trackId: id,
      user: user?.id,
    },
  });

  const [unvote] = useMutation(REMOVE_VOTE, {
    variables: {
      trackId: id,
      user: user?.id,
    },
  });
  const hasVoted = votes.some((v) => v?.user?.id === user?.id);

  const thumbnail = `https://i.ytimg.com/vi/${url
    .split("watch?v=")
    .pop()}/default.jpg`;

  return (
    <li className="row track" {...props}>
      <div className="row">
        <img className="thumbnail" src={thumbnail}></img>
        <p>{name || url}</p>
      </div>
      {/* {admin && <button onClick={remove}>Remove</button>} */}
      <UpvoteButton
        votes={votes}
        onClick={hasVoted ? unvote : vote}
        hasVoted={hasVoted}
      />
    </li>
  );
};

const CurrentTrack = ({ name, url, votes, hasVoted }) => {
  const thumbnail = `https://i.ytimg.com/vi/${url
    .split("watch?v=")
    .pop()}/default.jpg`;

  return (
    <div className={"row track"}>
      <div className="row">
        <img className="thumbnail" src={thumbnail}></img>
        <p>{name || url}</p>
      </div>
      <UpvoteButton votes={votes} disabled hasVoted={hasVoted} />
    </div>
  );
};

export default SideBar;
