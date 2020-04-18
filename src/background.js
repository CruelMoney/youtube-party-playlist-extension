import "@babel/polyfill";
import { client } from "./ConnectBackend";
import { JOIN_PARTY, PLAYLIST_UPDATED } from "./gql";

let AppInitState = 0; // it means app is off on startup
let partyTabId = null;

/**
 * Main extension functionality
 *
 * @class Main
 */
class Main {
  constructor() {}
  popUpClickSetup() {
    chrome.browserAction.onClicked.addListener((tab) => {
      if (this.toggleApp()) {
      } else {
        this.stopApp();
      }
    });
  }

  /**
   * toggle app
   *
   * @method
   * @memberof Main
   */
  toggleApp = () => {
    AppInitState = AppInitState ? 0 : 1;

    return AppInitState;
  };

  /**
   * stop app
   *
   * @method
   * @memberof Main
   */
  stopApp = () => {
    AppInitState = 0;
  };
}

const showPartyConsole = ({ tabId }) => {
  chrome.tabs.executeScript(tabId, {
    file: "content_script.bundle.js",
  });
};

const onPartyStarted = ({ payload, sendResponse, tabId }) => {
  chrome.storage.local.set({ party: payload });
  showPartyConsole({ tabId });
  sendResponse && sendResponse(true);
};

const onPartyJoined = async ({ playlistId, tabId }) => {
  // get party
  const { data } = await client.mutate({
    mutation: JOIN_PARTY,
    variables: { id: playlistId },
  });
  const party = data?.joinParty;

  // redirect if we haven't redirected before
  if (party) {
    showPartyConsole({ tabId });

    if (partyTabId === tabId) {
      handlePartyUpdate(party, tabId);
    }
    if (!partyTabId) {
      partyTabId = tabId;
      handlePartyUpdate(party, partyTabId);
      client
        .subscribe({ query: PLAYLIST_UPDATED, variables: { id: playlistId } })
        .subscribe({
          next: ({ data }) => {
            const party = data?.playlistUpdated;
            if (party) {
              handlePartyUpdate(party, tabId);
            }
          },
        });
    }
  }
};

const handlePartyUpdate = ({ tracks, currentIndex }, tabId) => {
  const track = tracks[currentIndex];
  if (track) {
    chrome.tabs.query({ url: track.url }, (tabs) => {
      if (!tabs.length) {
        chrome.tabs.update(tabId, { url: track.url });
      }
    });
  }
};

const onLeaveParty = ({ payload, sendResponse }) => {
  chrome.storage.local.remove("party");
  sendResponse(true);
};

const MESSAGE_HANDLERS = {
  PARTY_STARTED: onPartyStarted,
  LEAVE_PARTY: onLeaveParty,
};

chrome.runtime.onMessage.addListener(function (
  { type, payload, ...rest },
  sender,
  sendResponse
) {
  const fun = MESSAGE_HANDLERS[type];
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (fun) {
      fun({ payload, sendResponse, tabId: tabs[0].id });
    }
  });
});

// on loading tab
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "complete" && tab.active) {
    const url = new URL(tab.url);
    if (url.host.includes("youtube")) {
      const playlistId = url.searchParams.get("playlistPartyId");

      if (playlistId) {
        onPartyJoined({ playlistId, tabId });
      } else {
        chrome.storage.local.get(["party"], function (result) {
          if (result?.party) {
            // start content script when page is loaded and we have a party
            onPartyJoined({ playlistId: result?.party?.id, tabId });
          }
        });
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === partyTabId) {
    partyTabId = null;
  }
});
