import { prisma } from "@/lib/db";
import { SupportClient } from "./_components/support-client";

export default async function SupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: { attachments: true }
  });
  return (
    <SupportClient
      initialTickets={tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        attachments: ticket.attachments.map((file) => ({
          id: file.id,
          fileNameOriginal: file.fileNameOriginal
        }))
      }))}
    />
  );
}
