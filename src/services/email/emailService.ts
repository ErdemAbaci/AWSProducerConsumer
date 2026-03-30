import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailResult = {
  messageId: string;
  recipient: string;
};

const sesClient = new SESv2Client({});

function getFromEmail() {
  const fromEmail = process.env.SES_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("SES_FROM_EMAIL environment variable is required");
  }

  return fromEmail;
}

export const emailService = {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const command = new SendEmailCommand({
      FromEmailAddress: getFromEmail(),
      Destination: {
        ToAddresses: [input.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: input.subject,
          },
          Body: {
            Text: {
              Data: input.body,
            },
          },
        },
      },
    });

    const response = await sesClient.send(command);

    return {
      messageId: response.MessageId ?? "unknown-message-id",
      recipient: input.to,
    };
  },
};