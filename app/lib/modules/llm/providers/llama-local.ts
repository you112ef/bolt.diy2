import OpenAILikeProvider from './openai-like'; // Assuming this is the correct path
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class LlamaLocalProvider extends OpenAILikeProvider {
  name = 'LLaMA (Local)';
  id = 'llama-local'; // Explicitly setting id

  // Override config from OpenAILikeProvider
  config = {
    baseUrlKey: 'LLAMA_CPP_BASE_URL',
    apiTokenKey: 'LLAMA_CPP_API_TOKEN', // LLaMA.cpp usually doesn't need a token
  };

  // LLaMA.cpp might not have a standard models list endpoint or require auth for it.
  // If getDynamicModels from OpenAILikeProvider fails or isn't suitable,
  // we can override it here or provide a static list.
  // For now, rely on inheritance and test.
  // staticModels: ModelInfo[] = [
  //   { name: "LLaMA Default", id: "llama-default", label: "LLaMA Default", provider: this.name, maxTokenAllowed: 4096, type: "chat" }
  // ];

  // Override getDynamicModels to make API key optional for LLaMA.cpp
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: this.config.baseUrlKey,
      defaultApiTokenKey: this.config.apiTokenKey,
    });

    if (!baseUrl) { // Only base URL is strictly necessary for LLaMA.cpp typically
      return this.staticModels || []; // Return static models if base URL isn't set
    }

    try {
      const headers: HeadersInit = {};
      if (apiKey) { // Only add Authorization header if apiKey is present
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/models`, { headers });

      if (!response.ok) {
        console.error(`Error fetching models from ${this.name}: ${response.status} ${response.statusText}`);
        return this.staticModels || []; // Return static models on error
      }

      const res = (await response.json()) as any;

      // Assuming the response structure is similar to OpenAI's /models endpoint
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((model: any) => ({
          name: model.id,
          label: model.id, // Or model.name if available and preferred
          provider: this.name,
          id: model.id, 
          maxTokenAllowed: model.max_token || 8000, // Or some other field / default
          type: 'chat', // Assuming chat models
        }));
      } else {
        console.warn(`Unexpected model list format from ${this.name}. Returning static models.`);
        return this.staticModels || [];
      }
    } catch (error) {
      console.error(`Failed to fetch dynamic models for ${this.name}:`, error);
      return this.staticModels || []; // Return static models on error
    }
  }

  // Override getModelInstance to make API key optional
  getModelInstance(options: {
    model: string;
    serverEnv: Env; // Make sure Env type is correctly imported or defined
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: this.config.baseUrlKey,
      defaultApiTokenKey: this.config.apiTokenKey,
    });

    if (!baseUrl) { // Base URL is essential
      throw new Error(`Missing base URL for ${this.name} provider (env var ${this.config.baseUrlKey})`);
    }
    
    // Use the getOpenAILikeModel utility, which should handle the apiKey being undefined
    // if the underlying 'openai' package handles it gracefully.
    // The 'openai' package version 4.x and 5.x allows apiKey to be undefined or null.
    return super.getModelInstance(options); // Call base class method which uses getOpenAILikeModel
                                          // This assumes getOpenAILikeModel can handle an empty/undefined API key
                                          // and that the LLaMA.cpp server doesn't require one.
  }
}
