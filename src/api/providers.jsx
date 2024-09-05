/// This module unifies all available providers.
/// It provides functions to communicate directly with each provider,
/// as well as predefined info for each provider.

import { Form, getPreferenceValues } from "@raycast/api";

/// For user-friendly names
import { preferences } from "../../package.json";

/// Provider modules
import { NexraProvider } from "./Providers/nexra";
import { DeepInfraProvider } from "./Providers/deepinfra";
import { BlackboxProvider } from "./Providers/blackbox";
import { DuckDuckGoProvider } from "./Providers/duckduckgo";
import { BestIMProvider } from "./Providers/bestim";
import { RocksProvider } from "./Providers/rocks";
import { PizzaGPTProvider } from "./Providers/pizzagpt";
import { MetaAIProvider } from "./Providers/metaAI";
import { SambaNovaProvider } from "./Providers/sambanova";
import { ReplicateProvider } from "./Providers/replicate";
import { GeminiProvider } from "./Providers/google_gemini";
import { G4FLocalProvider } from "./Providers/g4f_local";
import { OllamaLocalProvider } from "./Providers/ollama_local";

/// All providers info
// { provider internal name, {provider object, model, stream, extra options} }
// prettier-ignore
export const providers_info = {
  NexraChatGPT: { provider: NexraProvider, model: "chatgpt", stream: true },
  NexraGPT4o: { provider: NexraProvider, model: "gpt-4o", stream: true },
  NexraGPT4: { provider: NexraProvider, model: "gpt-4-32k", stream: false },
  NexraBing: { provider: NexraProvider, model: "Bing", stream: true },
  NexraLlama31: { provider: NexraProvider, model: "llama-3.1", stream: true },
  NexraGeminiPro: { provider: NexraProvider, model: "gemini-pro", stream: true },
  DeepInfraLlama31_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct", stream: true },
  DeepInfraLlama31_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-8B-Instruct", stream: true },
  DeepInfraLlama31_405B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3.1-405B-Instruct", stream: true },
  DeepInfraMixtral_8x22B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x22B-Instruct-v0.1", stream: true },
  DeepInfraMixtral_8x7B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x7B-Instruct-v0.1", stream: true },
  DeepInfraQwen2_72B: { provider: DeepInfraProvider, model: "Qwen/Qwen2-72B-Instruct", stream: true },
  DeepInfraMistral_7B: { provider: DeepInfraProvider, model: "mistralai/Mistral-7B-Instruct-v0.3", stream: true },
  DeepInfraWizardLM2_8x22B: { provider: DeepInfraProvider, model: "microsoft/WizardLM-2-8x22B", stream: true },
  DeepInfraLlama3_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-8B-Instruct", stream: true, context_tokens: 8000 },
  DeepInfraLlama3_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-70B-Instruct", stream: true, context_tokens: 8000 },
  DeepInfraOpenChat36_8B: { provider: DeepInfraProvider, model: "openchat/openchat-3.6-8b", stream: true, context_tokens: 8000 },
  DeepInfraGemma2_27B: { provider: DeepInfraProvider, model: "google/gemma-2-27b-it", stream: true, context_tokens: 4096 },
  DeepInfraLlava15_7B: { provider: DeepInfraProvider, model: "llava-hf/llava-1.5-7b-hf", stream: true, context_tokens: 4096 },
  Blackbox: { provider: BlackboxProvider, model: "", stream: true },
  DuckDuckGo_GPT4oMini: { provider: DuckDuckGoProvider, model: "gpt-4o-mini", stream: true, context_tokens: 4096 },
  DuckDuckGo_Claude3Haiku: { provider: DuckDuckGoProvider, model: "claude-3-haiku-20240307", stream: true, context_tokens: 4096 },
  DuckDuckGo_Llama31_70B: { provider: DuckDuckGoProvider, model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", stream: true, context_tokens: 4096 },
  DuckDuckGo_Mixtral_8x7B: { provider: DuckDuckGoProvider, model: "mistralai/Mixtral-8x7B-Instruct-v0.1", stream: true, context_tokens: 4096 },
  BestIM_GPT4oMini: { provider: BestIMProvider, model: "", stream: true },
  RocksClaude35Sonnet: { provider: RocksProvider, model: "claude-3-5-sonnet-20240620", stream: true },
  RocksClaude3Opus: { provider: RocksProvider, model: "claude-3-opus-20240229", stream: true },
  RocksGPT4o: { provider: RocksProvider, model: "gpt-4o", stream: true },
  RocksGPT4: { provider: RocksProvider, model: "gpt-4", stream: true },
  RocksLlama31_405B: { provider: RocksProvider, model: "llama-3.1-405b-turbo", stream: true },
  RocksLlama31_70B: { provider: RocksProvider, model: "llama-3.1-70b-turbo", stream: true },
  PizzaGPT: { provider: PizzaGPTProvider, model: "", stream: false },
  MetaAI: { provider: MetaAIProvider, model: "", stream: true },
  SambaNovaLlama31_405B: { provider: SambaNovaProvider, model: "llama3-405b", stream: true, context_tokens: 4096 },
  SambaNovaLlama3_70B: { provider: SambaNovaProvider, model: "llama3-70b", stream: true },
  SambaNovaLlama3_8B: { provider: SambaNovaProvider, model: "llama3-8b", stream: true },
  ReplicateLlama3_8B: { provider: ReplicateProvider, model: "meta/meta-llama-3-8b-instruct", stream: true },
  ReplicateLlama3_70B: { provider: ReplicateProvider, model: "meta/meta-llama-3-70b-instruct", stream: true },
  ReplicateLlama31_405B: { provider: ReplicateProvider, model: "meta/meta-llama-3.1-405b-instruct", stream: true },
  ReplicateMixtral_8x7B: { provider: ReplicateProvider, model: "mistralai/mixtral-8x7b-instruct-v0.1", stream: true },
  GoogleGemini: { provider: GeminiProvider, model: ["gemini-1.5-pro-exp-0827", "gemini-1.5-pro-exp-0801", "gemini-1.5-flash-exp-0827", "gemini-1.5-flash-latest"], stream: true },
  G4FLocal: { provider: G4FLocalProvider, stream: true },
  OllamaLocal: { provider: OllamaLocalProvider, stream: true },
};

/// Chat providers (user-friendly names)
// fetched from package.json for consistency and to avoid duplicate code
export const chat_providers_names = preferences
  .find((x) => x.name === "gptProvider")
  .data.map((x) => [x.title, x.value]);

export const ChatProvidersReact = chat_providers_names.map((x) => {
  return <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />;
});

/// Providers that support file uploads
export const file_supported_providers = [GeminiProvider, DeepInfraProvider];

/// Providers that support function calling
export const function_supported_providers = [DeepInfraProvider];

// Additional options
export const additional_provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = parseFloat(chatOptions.creativity);
    temperature = Math.max(0.0, temperature).toFixed(1);
    options.temperature = temperature;
  } else {
    options.temperature = 0.7;
  }
  return options;
};

// Additional properties
// providers that handle the stream update in a custom way (see chatCompletion function)
export const custom_stream_handled_providers = [GeminiProvider];

/// Main function for generation
// note that provider is the provider object, not the provider string
export const generate = async function (provider, chat, options, { stream_update = null, max_retries = 5 }) {
  return provider.generate(chat, options, { stream_update, max_retries });
};

// Utilities
export const default_provider_string = () => {
  return getPreferenceValues()["gptProvider"];
};

// Parse provider string
export const get_provider_string = (provider) => {
  if (provider && Object.keys(providers_info).includes(provider)) return provider;
  return default_provider_string();
};

// Get provider info based on a provider STRING (i.e. the key in providers_info)
// if providerString is not supplied or is incorrect, implicitly return the default provider
export const get_provider_info = (providerString) => {
  return providers_info[get_provider_string(providerString)];
};

// Get options from info
export const get_options_from_info = (info, chatOptions = {}) => {
  const provider = info.provider;
  // we delete the provider key since it's not an option
  return {
    ...info,
    ...chatOptions,
    ...additional_provider_options(provider, chatOptions),
    provider: undefined,
  };
};
