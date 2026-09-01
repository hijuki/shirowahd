
import { randomUUID, getRandomValues } from "crypto";
import { proto, generateWAMessageFromContent } from "hillz";

const CodeHighlightType = {
  DEFAULT: 0,
  KEYWORD: 1,
  COMMENT: 2,
  STRING: 3,
  METHOD: 4,
  NUMBER: 5,
};

const RichSubMessageType = {
  TEXT: 0,
  IMAGE: 1,
  VIDEO: 2,
  AUDIO: 3,
  DOCUMENT: 4,
  LOCATION: 5,
  CONTACT: 6,
  STICKER: 7,
  CODE: 8,
  CONTENT_ITEMS: 9,
  INLINE_IMAGE: 10,
  LATEX: 11,
  TABLE: 12,
};

const botMetadataSignature = () => {
  const signature = new Uint8Array(64);
  getRandomValues(signature);
  return signature;
};

const botMetadataCertificate = (length = 685) => {
  const certificate = new Uint8Array(length);
  certificate[0] = 48;
  certificate[1] = 130;
  getRandomValues(certificate.subarray(2));
  return certificate;
};

const wrapToBotForwardedMessage = (richResponseMessage) => ({
  messageContextInfo: {
    botMetadata: {
      verificationMetadata: {
        proofs: [
          {
            certificateChain: [
              botMetadataCertificate(),
              botMetadataCertificate(892),
            ],
            version: 1,
            useCase: 1,
            signature: botMetadataSignature(),
          },
        ],
      },
    },
  },
  botForwardedMessage: {
    message: { richResponseMessage },
  },
});

/**
 * 2. Generate Native WhatsApp Table Message
 */
export function generateNativeTableMessage(title, headers = [], rows = [], options = {}) {
  const tableRows = [];
  if (headers && headers.length > 0) {
    tableRows.push({
      isHeading: true,
      items: headers.map((h) => String(h)),
    });
  }
  for (const r of rows) {
    const cells = Array.isArray(r) ? r.map((c) => String(c)) : [String(r)];
    tableRows.push({
      isHeading: false,
      items: cells,
    });
  }

  const submessages = [
    {
      messageType: RichSubMessageType.TABLE,
      tableMetadata: {
        title: title || "Tabel Data",
        rows: tableRows,
      },
    },
  ];

  const uuid = randomUUID();
  const unified = {
    response_id: uuid,
    sections: submessages.map((submessage) => {
      const tableMetadata = submessage.tableMetadata;
      return {
        view_model: {
          primitive: {
            title: tableMetadata.title,
            rows: tableMetadata.rows.map((row) => ({
              is_header: row.isHeading,
              cells: row.items,
              markdown_cells: row.items.map((item) => ({ text: item })),
            })),
            __typename: "GenATableUXPrimitive",
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      };
    }),
  };

  const richResponseMessage = proto.AIRichResponseMessage.create({
    submessages,
    messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
    unifiedResponse: {
      data: Buffer.from(JSON.stringify(unified)),
    },
    contextInfo: {
      isForwarded: true,
      forwardingScore: 1,
      forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
      forwardOrigin: 4,
      ...(options.contextInfo || {}),
    },
  });

  const message = wrapToBotForwardedMessage(richResponseMessage);
  if (options.disclaimerText) {
    message.messageContextInfo.botMetadata.messageDisclaimerText = options.disclaimerText;
  }
  message.messageContextInfo.botMetadata.botResponseId = uuid;
  return message;
}

/**
 * 4. AI Meta Context Info Helper (Menambahkan Badge AI Resmi)
 */
export function getAiContextInfo(extraContext = {}) {
  return {
    isForwarded: true,
    forwardingScore: 1,
    forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
    forwardOrigin: 4,
    ...extraContext,
  };
}
