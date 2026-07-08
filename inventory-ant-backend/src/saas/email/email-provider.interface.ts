export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(options: EmailSendOptions): Promise<void>;
}
