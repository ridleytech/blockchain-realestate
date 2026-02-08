const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Property = require("../models/Property");
const { TextDecoder } = require("util");
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");
const {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");

function getBedrockClient() {
  return new BedrockRuntimeClient({
    region:
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2",
  });
}

function getKBClient() {
  return new BedrockAgentRuntimeClient({
    region:
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2",
  });
}

function buildPropertyContext(property) {
  const ctx = {
    id: property._id ? property._id.toString() : undefined,
    title: property.title,
    description: property.description,
    address: property.address,
    price: property.price,
    priceCurrency: property.priceCurrency,
    totalShares: property.totalShares,
    availableShares: property.availableShares,
    sharePrice: property.sharePrice,
    propertyType: property.propertyType,
    size: property.size,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    yearBuilt: property.yearBuilt,
    isListed: property.isListed,
    ownersCount: Array.isArray(property.currentOwners)
      ? property.currentOwners.length
      : 0,
    imagesCount: Array.isArray(property.images) ? property.images.length : 0,
    features: Array.isArray(property.features)
      ? property.features.map((f) => ({ name: f.name, value: f.value }))
      : [],
  };
  return ctx;
}

// POST /api/ai/ask
// Body: { propertyId: string, question: string }
router.post("/ask", auth.protect, async (req, res) => {
  try {
    const { propertyId, question } = req.body || {};

    const debugEnabled =
      process.env.NODE_ENV === "development" && req.query.debug === "1";

    if (!propertyId || !question) {
      return res.status(400).json({
        success: false,
        message: "propertyId and question are required",
      });
    }

    // Basic safety: limit question size and reject empty/unsafe input
    const trimmedQ = String(question).trim();
    if (trimmedQ.length === 0 || trimmedQ.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Question must be between 1 and 500 characters",
      });
    }
    const banned = [/^\s*prompt\s*injection/i];
    if (banned.some((re) => re.test(trimmedQ))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid question" });
    }

    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    const modelId =
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-5-sonnet-20241022-v1:0";
    const client = getBedrockClient();

    const systemPrompt = [
      "You are an assistant for a blockchain real estate investment platform.",
      "Answer clearly and concisely using the provided property facts.",
      "Do not provide financial advice or guarantees. If data is missing, state the limitation.",
      "Keep answers investor-friendly and factual.",
    ].join(" ");

    const context = buildPropertyContext(property);
    // Truncate long description to keep context small
    if (context.description && context.description.length > 1200) {
      context.description = context.description.slice(0, 1200) + "...";
    }
    // Retrieve relevant documents from Bedrock Knowledge Bases if configured
    let retrievedSnippets = [];
    let citations = [];
    let retrievalDebug;
    if (process.env.KNOWLEDGE_BASE_ID) {
      try {
        const kbClient = getKBClient();
        const retrievalText = `Property ID: ${context.id}\nCity: ${
          context?.address?.city || ""
        }\nQuestion: ${trimmedQ}`;
        const retrieve = new RetrieveCommand({
          knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
          retrievalQuery: {
            text: retrievalText,
          },
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 3,
            },
          },
        });
        const retrieveRes = await kbClient.send(retrieve);

        const retrievalResults = Array.isArray(retrieveRes?.retrievalResults)
          ? retrieveRes.retrievalResults
          : [];

        if (debugEnabled) {
          retrievalDebug = {
            knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
            region:
              process.env.AWS_REGION ||
              process.env.AWS_DEFAULT_REGION ||
              "us-west-2",
            retrievalText,
            retrievedReferencesCount: retrievalResults.length,
            sources: retrievalResults.map((ref) => {
              const uri = ref?.location?.s3Location?.uri;
              return uri || ref?.location?.type || "unknown";
            }),
          };
          console.log("KB retrieve debug:", JSON.stringify(retrievalDebug));
        }

        retrievedSnippets = retrievalResults
          .map((ref) => ref.content?.text)
          .filter(Boolean);
        citations = retrievalResults.map((ref) => ({
          source:
            (ref.location &&
              ref.location.s3Location &&
              ref.location.s3Location.uri) ||
            ref.location?.type ||
            "unknown",
        }));
      } catch (kbErr) {
        console.warn(
          "Knowledge Base retrieval failed:",
          kbErr?.message || kbErr,
        );
      }
    }

    const kbContext = retrievedSnippets.length
      ? `\n\nRetrieved documents (most relevant first):\n${retrievedSnippets
          .map((t, i) => `#${i + 1}: ${t}`)
          .join("\n\n")}`
      : "";

    const userContent = `Property context (JSON):\n${JSON.stringify(
      context,
      null,
      2,
    )}${kbContext}\n\nUser question: ${question}`;

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userContent }],
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    };

    const cmdInput = {
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    };
    // Optional Bedrock Guardrails if configured
    if (
      process.env.BEDROCK_GUARDRAIL_ID &&
      process.env.BEDROCK_GUARDRAIL_VERSION
    ) {
      cmdInput.guardrailIdentifier = process.env.BEDROCK_GUARDRAIL_ID;
      cmdInput.guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION;
    }

    const command = new InvokeModelCommand(cmdInput);

    const response = await client.send(command);

    const decoder = new TextDecoder();
    const json = JSON.parse(decoder.decode(response.body));

    const answer = Array.isArray(json.content)
      ? json.content
          .map((c) => (c && c.type === "text" ? c.text : ""))
          .join("\n")
          .trim()
      : "";

    const responseBody = { success: true, answer, citations };
    if (debugEnabled && retrievalDebug) {
      responseBody.debug = { retrieval: retrievalDebug };
    }
    return res.status(200).json(responseBody);
  } catch (err) {
    console.error("/api/ai/ask error:", err);
    return res
      .status(500)
      .json({ success: false, message: "AI service error" });
  }
});

module.exports = router;
