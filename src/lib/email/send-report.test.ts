import { describe, it, expect, vi } from "vitest";

const mockSend = vi.fn().mockResolvedValue({ id: "email-123" });

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

describe("sendReportEmail", () => {
  it("envia email com anexo PDF", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const { sendReportEmail } = await import("./send-report");

    await sendReportEmail({
      to: "comercial@rhemadata.com",
      subject: "Diagnóstico — João",
      html: "<p>Novo diagnóstico</p>",
      attachment: { filename: "diagnostico.pdf", content: Buffer.from("fake-pdf") },
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "comercial@rhemadata.com",
        subject: "Diagnóstico — João",
        attachments: [
          expect.objectContaining({
            filename: "diagnostico.pdf",
          }),
        ],
      }),
    );
  });

  it("lança erro quando RESEND_API_KEY não configurada", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    vi.resetModules();
    const { sendReportEmail: freshSend } = await import("./send-report");

    await expect(
      freshSend({
        to: "test@test.com",
        subject: "test",
        html: "<p>test</p>",
        attachment: { filename: "test.pdf", content: Buffer.from("x") },
      }),
    ).rejects.toThrow("RESEND_API_KEY não configurada");

    process.env.RESEND_API_KEY = original;
  });
});
