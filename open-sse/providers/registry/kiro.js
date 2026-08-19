export default {
  id: "kiro",
  priority: 10,
  alias: "kr",
  uiAlias: "kr",
  display: {
    name: "Kiro AI",
    icon: "psychology_alt",
    color: "#FF6B35",
    website: "https://kiro.dev",
    notice: {
      signupUrl: "https://kiro.dev",
    },
    deprecated: true,
    deprecationNotice: "RISK_NOTICE",
  },
  category: "free",
  transport: {
    baseUrl: "https://runtime.us-east-1.kiro.dev/generateAssistantResponse",
    baseUrls: [
      "https://runtime.us-east-1.kiro.dev/generateAssistantResponse",
      "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse",
      "https://q.us-east-1.amazonaws.com/generateAssistantResponse",
    ],
    format: "kiro",
    retry: {
      "429": 0,
    },
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.amazon.eventstream",
      "X-Amz-Target": "AmazonCodeWhispererStreamingService.GenerateAssistantResponse",
      "User-Agent": "AWS-SDK-JS/3.0.0 kiro-ide/1.0.0",
      "X-Amz-User-Agent": "aws-sdk-js/3.0.0 kiro-ide/1.0.0",
    },
    tokenUrl: "https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken",
    authUrl: "https://prod.us-east-1.auth.desktop.kiro.dev",
    usage: {
      cwHost: "https://codewhisperer.us-east-1.amazonaws.com",
      qHost: "https://q.us-east-1.amazonaws.com",
      limitsPath: "/getUsageLimits",
    },
  },
  models: [
    // Auto
    { id: "auto", name: "Auto (Kiro Router)" },
    // GPT-5.6 (OpenAI) — 272K context, Experimental
    { id: "gpt-5.6-sol", name: "GPT 5.6 Sol", contextLength: 272000, rateMultiplier: 2.4, upstreamModelId: "gpt-5.6-sol", description: "Flagship GPT-5.6 tier for hardest multi-step work" },
    { id: "gpt-5.6-terra", name: "GPT 5.6 Terra", contextLength: 272000, rateMultiplier: 1.0, upstreamModelId: "gpt-5.6-terra", description: "Balanced tier for routine multi-step development" },
    { id: "gpt-5.6-luna", name: "GPT 5.6 Luna", contextLength: 272000, rateMultiplier: 0.1, upstreamModelId: "gpt-5.6-luna", description: "Fastest, lowest-cost GPT-5.6 tier" },
    // Claude Opus — 1M context
    { id: "claude-opus-5", name: "Claude Opus 5", contextLength: 1000000, rateMultiplier: 2.2, upstreamModelId: "claude-opus-5", description: "Strongest agentic coding model, state-of-the-art" },
    { id: "claude-opus-4.8", name: "Claude Opus 4.8", contextLength: 1000000, rateMultiplier: 2.2, upstreamModelId: "claude-opus-4.8", description: "Most honest Opus, 4x less likely to let flaws pass" },
    { id: "claude-opus-4.7", name: "Claude Opus 4.7", contextLength: 1000000, rateMultiplier: 2.2, upstreamModelId: "claude-opus-4.7", description: "Adaptive thinking, scales reasoning by task complexity" },
    { id: "claude-opus-4.6", name: "Claude Opus 4.6", contextLength: 1000000, rateMultiplier: 2.2, upstreamModelId: "claude-opus-4.6", description: "Top scores on Terminal-Bench 2.0 and SWE-bench" },
    { id: "claude-opus-4.5", name: "Claude Opus 4.5", contextLength: 200000, rateMultiplier: 2.2, upstreamModelId: "claude-opus-4.5", description: "Handles tradeoffs and ambiguity well" },
    // Claude Sonnet
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", contextLength: 1000000, rateMultiplier: 1.3, upstreamModelId: "claude-sonnet-5", description: "Most agentic Sonnet, approaches Opus 4.8" },
    { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", contextLength: 1000000, rateMultiplier: 1.3, upstreamModelId: "claude-sonnet-4.6", description: "Full upgrade from Sonnet 4.5, approaches Opus 4.6" },
    { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", contextLength: 200000, rateMultiplier: 1.3, upstreamModelId: "claude-sonnet-4.5", description: "Strong agentic coding with extended autonomous operation" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4.0", contextLength: 200000, rateMultiplier: 1.3, upstreamModelId: "claude-sonnet-4", description: "Direct access, predictable behavior" },
    // Claude Haiku
    { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", contextLength: 200000, rateMultiplier: 0.4, upstreamModelId: "claude-haiku-4.5", description: "Fastest model with near-frontier performance" },
    // Non-Anthropic
    { id: "deepseek-3.2", name: "DeepSeek 3.2", contextLength: 128000, rateMultiplier: 0.25, upstreamModelId: "deepseek-3.2", strip: ["image", "audio"], description: "Best for agentic workflows and code generation" },
    { id: "qwen3-coder-next", name: "Qwen3 Coder Next", contextLength: 256000, rateMultiplier: 0.05, upstreamModelId: "qwen3-coder-next", strip: ["image", "audio"], description: "Purpose-built for coding agents, most cost-effective" },
    { id: "glm-5", name: "GLM 5", contextLength: 200000, rateMultiplier: 0.5, upstreamModelId: "glm-5", description: "Sparse MoE for complex systems engineering" },
    { id: "minimax-m2.5", name: "MiniMax M2.5", contextLength: 200000, rateMultiplier: 0.25, upstreamModelId: "minimax-m2.5", description: "Open weight, near frontier-class coding" },
    { id: "minimax-m2.1", name: "MiniMax M2.1", contextLength: 200000, rateMultiplier: 0.15, upstreamModelId: "minimax-m2.1", description: "Best for multilingual programming and UI generation" },
  ],
  oauth: {
    ssoOidcEndpoint: "https://oidc.us-east-1.amazonaws.com",
    registerClientUrl: "https://oidc.us-east-1.amazonaws.com/client/register",
    deviceAuthUrl: "https://oidc.us-east-1.amazonaws.com/device_authorization",
    tokenUrl: "https://oidc.us-east-1.amazonaws.com/token",
    startUrl: "https://view.awsapps.com/start",
    clientName: "kiro-oauth-client",
    clientType: "public",
    scopes: [
      "codewhisperer:completions",
      "codewhisperer:analysis",
      "codewhisperer:conversations",
    ],
    grantTypes: [
      "urn:ietf:params:oauth:grant-type:device_code",
      "refresh_token",
    ],
    issuerUrl: "https://identitycenter.amazonaws.com/ssoins-722374e8c3c8e6c6",
    socialAuthEndpoint: "https://prod.us-east-1.auth.desktop.kiro.dev",
    socialLoginUrl: "https://prod.us-east-1.auth.desktop.kiro.dev/login",
    socialTokenUrl: "https://prod.us-east-1.auth.desktop.kiro.dev/oauth/token",
    socialRefreshUrl: "https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken",
    authMethods: [
      "builder-id",
      "idc",
      "google",
      "github",
      "import",
    ],
  },
  features: {
    usage: true,
    usageApikey: true,
  },
};
