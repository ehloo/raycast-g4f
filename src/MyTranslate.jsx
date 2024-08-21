import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  getSelectedText,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { Storage } from "./api/storage";
import { current_datetime, formatDate, removePrefix } from "./helpers/helper";

import { MessagePair } from "./classes/message";

import { formatResponse, getChatResponse } from "./api/gpt";
import * as providers from "./api/providers";


let generationStatus = { stop: false, loading: false };
let get_status = () => generationStatus.stop;

export default function MyTranslate({ launchContext }) {
  const toast = async (style, title, message) => {
    return await showToast({
      style,
      title,
      message,
    });
  };

  /// The following utilities are used for managing chats.
  /// In v3.0, the chat system was rewritten so that we now only load chats from storage
  /// when they are needed. We maintain two main data structures: chatData and currentChatData.
  /// chatData contains all the chats (a lite version that only contains metadata), while
  /// currentChatData contains the full chat data for the currently selected chat.

  const storageKeyPrefix = "AIMyTranslate_";
  const getStorageKey = (chat_id) => {
    return `${storageKeyPrefix}${chat_id}`;
  };

  // add chat to chatData
  const addChat = (setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats.push(to_lite_chat_data(chat));
      return newChatData;
    });
  };

  // add chat to chatData and set it as the current chat
  const addChatAsCurrent = (setChatData, setCurrentChatData, chat) => {
    addChat(setChatData, chat);
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.currentChat = chat.id;
      return newChatData;
    });
    setCurrentChatData(chat);
  };

  // delete chat from storage and chatData
  const deleteChat = async (setChatData, id) => {
    await Storage.delete(getStorageKey(id));

    let chatIdx = chatData.chats.findIndex((chat) => chat.id === id);
    if (chatIdx === -1) return;
    if (chatData.chats.length === 1) {
      await clear_chats_data(setChatData, setCurrentChatData);
      return;
    }

    if (chatIdx === chatData.chats.length - 1) {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx - 1].id;
        }
        return newChatData;
      });
    } else {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx, 1);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx].id;
        }
        return newChatData;
      });
    }

    await toast(Toast.Style.Success, "Chat deleted");
  };

  // update chat in storage
  const updateChat = async (chat, id = null) => {
    id = id ?? chat.id;
    await Storage.write(getStorageKey(id), JSON.stringify(chat));
  };

  // get chat from storage
  const getChat = async (target) => {
    return JSON.parse(await Storage.read(getStorageKey(target), JSON.stringify(chat_data({}))));
  };

  // the lite version of the chat, stored in chatData
  const to_lite_chat_data = (chat) => {
    return {
      name: chat.name,
      creationDate: chat.creationDate,
      id: chat.id,
    };
  };

  // clear chat data and set it to default
  const clear_chats_data = async (setChatData, setCurrentChatData) => {
    // first we clear all chats from storage; since we are deleting everything, we can do this first
    await pruneStoredChats([]);

    let newChat = chat_data({});
    setChatData({
      currentChat: newChat.id,
      chats: [],
    });
    await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
    setCurrentChatData(newChat);
  };

  const chat_data = ({
    name = "New Chat",
    creationDate = new Date(),
    id = Date.now().toString(), // toString() is important because Raycast expects a string for value
    provider = providers.default_provider_string(),
    systemPrompt = "",
    messages = [],
    options = {},
  }) => {
    return {
      name: name,
      creationDate: creationDate,
      id: id,
      provider: provider,
      systemPrompt: systemPrompt,
      messages: messages?.length ? messages : starting_messages(systemPrompt, provider),
      options: options,
    };
  };

  const starting_messages = (systemPrompt = "", provider = null) => {
    let messages = [];

    provider = providers.get_provider_info(provider).provider;

    if (systemPrompt) {
      messages.push(
        new MessagePair({
          prompt: systemPrompt,
          answer: systemResponse,
          visible: false,
        })
      );
    }
    return messages;
  };

  const setCurrentChatMessage = (
    currentChatData,
    setCurrentChatData,
    messageID,
    query = null,
    response = null,
    finished = null
  ) => {
    setCurrentChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = newChatData.messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query !== null) messages[i].first.content = query;
          if (response !== null) messages[i].second.content = response;
          if (finished !== null) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  const updateChatResponse = async (
    currentChatData,
    setCurrentChatData,
    messageID,
    query = null,
  ) => {
    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, ""); // set response to empty string

    const info = providers.get_provider_info(currentChatData.provider);

    let elapsed = 0.001,
      chars,
      charPerSec;
    let start = Date.now();
    let response = "";

    let fixCurrent = {
      messages: [],
      options: {
        creativity: 0.0,
      },
    }

    if (!info.stream) {
      // response = await getChatResponse(currentChatData, query);
      response = await getChatResponse(fixCurrent, query);
      setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, response);

      elapsed = (Date.now() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      let loadingToast = await toast(Toast.Style.Animated, "Response loading");
      generationStatus = { stop: false, loading: true };
      let i = 0;

      const handler = async (new_message) => {
        i++;
        response = new_message;
        response = formatResponse(response, info.provider);
        setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, response);

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      };

      // await getChatResponse(currentChatData, query, handler, get_status);
      await getChatResponse(fixCurrent, query, handler, get_status);
    }

    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, null, true);

    await toast(
      Toast.Style.Success,
      "Response finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );
    generationStatus.loading = false;

  };

  // prune stored chats. we loop through all stored chats and delete those that are not in chatData
  // since this is potentially risky (if chatData is corrupted), we do this extremely sparingly
  const pruneStoredChats = async (chats) => {
    let storedChats = await Storage.localStorage_list();
    let prunedCnt = 0;

    let chatIDs = chats.reduce((acc, chat) => {
      acc[chat.id] = true;
      return acc;
    }, {});
    for (const key of Object.keys(storedChats)) {
      if (key.startsWith(storageKeyPrefix) && !chatIDs[removePrefix(key, storageKeyPrefix)]) {
        await Storage.delete(key);
        prunedCnt++;
      }
    }

    console.log(`Pruned ${prunedCnt} stored chats`);
  };

  const sendToGPT = async (myquery = null) => {
    let query = searchText;
    if (myquery) {
      query = myquery;
    }

    if (query === "") {
      toast(Toast.Style.Failure, "Please enter a query");
      return;
    }

    let prompt = `下面我让你来充当翻译家，你的目标是把任何语言翻译成中文，请翻译时不要带翻译腔，而是要翻译的自然、流畅和地道，使用优美和高雅的表达方式。你只需要翻译即可，请不要产生不必要的解释分析，也不要对我问任何问题，你只管翻译即可，不要进行任何其他交互。请输出翻译结果，然后再输出原文。请翻译下面这句话：` + `\n\n${query}`;
    let isWord = IsWord("zh", query);
    if (isWord) {
      prompt = `你是一个专业的多国语言词典引擎，有着媲美牛津词典的效果，请你将给定的其他语言单词翻译为汉语，只需要翻译不需要解释，也不要对我提问。返回的内容包含音标、单词词性及各词性的含义，并且>提供3个对照的例句。你应该清楚常见词典软件的格式，请必须按照格式：\n<单词> <音标>\n<词性英文简写>. <汉语释义>\n<其他词性>. <汉语释义>\n1. <例句1> <例句汉语翻译>\n2. <例句2> <例句汉语翻译>\n3. <例句3> <例句汉语翻译>。请翻译下面这个单词：` + `\n\n${query}`;
    }

    setSearchText("");
    toast(Toast.Style.Animated, "Response loading");

    let newMessagePair = new MessagePair({ prompt: prompt, files: [] });
    let newMessageID = newMessagePair.id;

    currentChatData.messages.unshift(newMessagePair);
    setCurrentChatData(currentChatData); // possibly redundant, put here for safety and consistency

    try {
      // Note how we don't pass query here because it is already in the chat
      // await updateChatResponse(currentChatData, setCurrentChatData, newMessageID);
      await updateChatResponse(currentChatData, setCurrentChatData, newMessageID, prompt);
    } catch {
      await toast(Toast.Style.Failure, "An error occurred");
    }
  };

  let GPTActionPanel = (props) => {
    const idx = props.idx ?? 0;

    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to GPT"
          onAction={async () => {
            await sendToGPT();
          }}
        />
        <ActionPanel.Section title="Current Chat">
          {!generationStatus.stop && (
            <Action
              title="Stop Response"
              icon={Icon.Pause}
              onAction={() => {
                generationStatus.stop = true;
              }}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "/" }}
            />
          )}
          <Action
            icon={Icon.Clipboard}
            title="Copy Response"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let response = currentChatData.messages[idx].second.content;
              await Clipboard.copy(response);
              await toast(Toast.Style.Success, "Response copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Danger zone">
          <Action
            icon={Icon.Trash}
            title="Delete Message"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted messages!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Message",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    if (currentChatData.messages.length === 0) {
                      toast(Toast.Style.Failure, "No messages to delete");
                      return;
                    }

                    // delete index idx
                    currentChatData.messages.splice(idx, 1);
                    setCurrentChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      newChatData.messages = currentChatData.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete All"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover this chat.",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Chat Forever",
                  style: Action.Style.Destructive,
                  onAction: async () => {
                    await deleteChat(setChatData, chatData.currentChat);
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            style={Action.Style.Destructive}
          />
          <Action
            icon={Icon.Trash}
            title="Delete All All"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted chats!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete ALL Chats Forever",
                  style: Action.Style.Destructive,
                  onAction: async () => {
                    await confirmAlert({
                      title: "Are you sure?",
                      message: "Please confirm that you want to delete all chats!",
                      icon: Icon.Trash,
                      primaryAction: {
                        title: "Delete ALL Chats Forever",
                        style: Action.Style.Destructive,
                        onAction: async () => {
                          await clear_chats_data(setChatData, setCurrentChatData);
                        },
                      },
                    });
                  },
                },
              });
            }}
            style={Action.Style.Destructive}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const [searchText, setSearchText] = useState("");
  let [chatData, setChatData] = useState(null);
  let [currentChatData, setCurrentChatData] = useState(null);
  let [dataLoaded, setDataLoaded] = useState(false);
  let [selectedItemId, setSelectedItemId] = useState(0);

  // Initialize the above variables
  useEffect(() => {
    (async () => {
      // initialise chatData
      const storedChatData = await Storage.read("translateData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        await clear_chats_data(setChatData, setCurrentChatData);
      }

      // if (launchContext?.query) {
      //   let newChatName = `From Quick AI at ${current_datetime()}`;
      //   let newChat = chat_data({
      //     name: newChatName,
      //     messages: [
      //       new MessagePair({
      //         prompt: launchContext.query.text,
      //         answer: launchContext.response,
      //         finished: true,
      //         files: launchContext.query.files,
      //       }),
      //     ],
      //   });
      //   addChatAsCurrent(setChatData, setCurrentChatData, newChat);
      // }
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await Storage.write("translateData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  useEffect(() => {
    if (currentChatData && chatData?.currentChat) {
      (async () => {
        await updateChat(currentChatData, chatData.currentChat);
      })();
      setDataLoaded(true);
    }
  }, [currentChatData]);

  useEffect(() => {
    if (chatData?.currentChat && currentChatData?.id !== chatData.currentChat) {
      (async () => {
        let chat = await getChat(chatData.currentChat);
        setCurrentChatData(chat);
      })();
    }
  }, [chatData?.currentChat]);

  useEffect(() => {
    (async () => {
      if (launchContext?.enableAutoLoadSelected && dataLoaded && !generationStatus.loading) {
        launchContext.enableAutoLoadSelected = false;

        try {
          const selectedText = (await getSelectedText()).trim();
          if (selectedText) {
            await sendToGPT(selectedText);
          }
        } catch (error) {
          console.log("=== Error ==> ", error);
          toast(Toast.Style.Failure, "An error occurred");
        }
      }
    })();
  }, [dataLoaded]);


  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="GPT Translate Anything..." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={!isChatEmpty(currentChatData)}
      searchBarPlaceholder="GPT Translate..."
    // id={selectedItemId}
    // searchBarAccessory={
    //   <List.Dropdown
    //     tooltip="Your Chats"
    //     onChange={(newChatID) => {
    //       setChatData((oldData) => ({
    //         ...oldData,
    //         currentChat: newChatID,
    //       }));
    //     }}
    //     value={chatData.currentChat}
    //   >
    //     {to_list_dropdown_items(chatData.chats)}
    //   </List.Dropdown>
    // }
    >
      {(() => {
        if (isChatEmpty(currentChatData)) {
          return <List.EmptyView icon={Icon.SpeechBubble} title="GPT Translate Anything..." actions={<GPTActionPanel />} />;
        }
        return currentChatData.messages.map((x, i) => {
          if (x.visible)
            return (
              <List.Item
                // title={x.first.content}
                title={cutQuery(x.first.content)}
                subtitle={formatDate(x.creationDate)}
                detail={
                  <List.Item.Detail
                    markdown={x.second.content}
                    // show metadata if files were uploaded
                    metadata={
                      x.files && x.files.length > 0 ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Files" />
                          {x.files.map((file, i) => (
                            <List.Item.Detail.Metadata.Label title="" text={file} key={i} />
                          ))}
                        </List.Item.Detail.Metadata>
                      ) : null
                    }
                  />
                }
                // key={x.id}
                key={i}
                actions={<GPTActionPanel idx={i} />}
              />
            );
        });
      })()}
    </List>
  );
}



const isChatEmpty = (chat) => {
  if (!chat) return true;
  for (const message of chat.messages) {
    if (message.visible) return false;
  }
  return true;
};

const to_list_dropdown_items = (chats) => {
  let pinned = [],
    unpinned = [];
  for (const chat of chats) {
    if (chat.pinned) pinned.push(chat);
    else unpinned.push(chat);
  }
  return (
    <>
      <List.Dropdown.Section title="Pinned">
        {pinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </List.Dropdown.Section>
      <>
        {unpinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </>
    </>
  );
};

function cutQuery(content) {
  let arr = content.split("\n");
  return arr[arr.length - 1];
}

function IsWord(lang, text) {
  text = text.trim();
  // eslint-disable-next-line no-undef
  const Segmenter = Intl.Segmenter;
  if (!Segmenter) {
    return false;
  }
  const segmenter = new Segmenter(lang, { granularity: "word" });
  const iterator = segmenter.segment(text)[Symbol.iterator]();
  return iterator.next().value.segment === text;
}


