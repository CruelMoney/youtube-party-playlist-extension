import React, { useEffect, useState } from "react";
import ConnectBackend from "../../ConnectBackend";
import { useMutation } from "@apollo/client";
import { START_PARTY } from "../../gql";

export default class Index extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <ConnectBackend>
        <div style={styles.container}>
          <h1>Create a YouTube Party</h1>
          <CreatePartyButton />
        </div>
      </ConnectBackend>
    );
  }
}

const CreatePartyButton = () => {
  const [mutate, { data }] = useMutation(START_PARTY);
  const partyUrl = data?.startParty?.url;

  if (partyUrl) {
    return <input value={partyUrl}></input>;
  }

  const startParty = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      // since only one tab should be active and in the current window at once
      // the return variable should only have one entry
      var activeTab = tabs[0];

      const { data } = await mutate({ variables: { url: activeTab?.url } });
      const id = data?.startParty?.id;

      if (id) {
        chrome.runtime.sendMessage({
          type: "PARTY_STARTED",
          payload: { id, admin: true },
        });
      }
    });
  };

  return <button onClick={startParty}>Start the party</button>;
};

const styles = {
  container: {
    padding: "15px",
    height: "500px",
    width: "375px",
  },
};
