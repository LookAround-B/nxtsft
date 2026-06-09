import { createNextHandler } from "@nxtsft/trpc/nextjs";

const handler = createNextHandler();
export { handler as GET, handler as POST };

